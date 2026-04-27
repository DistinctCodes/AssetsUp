import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Asset } from '../src/assets/asset.entity';
import { User, UserRole } from '../src/users/user.entity';
import { AssetHistory } from '../src/assets/asset-history.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('Assets E2E Tests', () => {
  let app: INestApplication;
  let assetsRepository: Repository<Asset>;
  let usersRepository: Repository<User>;
  let historyRepository: Repository<AssetHistory>;
  let jwtService: JwtService;
  let configService: ConfigService;

  let authToken: string;
  let user: User;

  const testAsset = {
    name: 'Test Asset',
    categoryId: 'category-123',
    departmentId: 'dept-123',
    description: 'A test asset for E2E testing',
    serialNumber: 'SN12345678',
    manufacturer: 'Test Manufacturer',
    model: 'Model X',
    location: 'Building A, Room 101',
    condition: 'NEW',
    status: 'ACTIVE',
    purchasePrice: 1000.00,
    currentValue: 800.00,
    purchaseDate: '2024-01-01',
    warrantyExpiration: '2026-01-01',
    tags: ['equipment', 'new'],
    notes: 'Test notes for asset',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    assetsRepository = moduleFixture.get('AssetRepository');
    usersRepository = moduleFixture.get('UserRepository');
    historyRepository = moduleFixture.get('AssetHistoryRepository');
    jwtService = moduleFixture.get(JwtService);
    configService = moduleFixture.get(ConfigService);

    // Create a test user
    user = usersRepository.create({
      email: 'assets-test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      password: await bcrypt.hash('TestPassword123!', 10),
      role: UserRole.STAFF,
    });
    await usersRepository.save(user);

    // Generate auth token
    const payload = { sub: user.id, email: user.email };
    authToken = await jwtService.signAsync(payload, {
      secret: configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    // Clean up test data
    await assetsRepository.delete({});
    await historyRepository.delete({});
  });

  afterAll(async () => {
    await assetsRepository.delete({});
    await historyRepository.delete({});
    await usersRepository.delete({ id: user.id });
    await app.close();
  });

  describe('POST /api/assets - Create Asset', () => {
    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should create a new asset with all fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('assetId');
      expect(response.body.name).toBe(testAsset.name);
      expect(response.body.categoryId).toBe(testAsset.categoryId);
      expect(response.body.departmentId).toBe(testAsset.departmentId);
      expect(response.body.description).toBe(testAsset.description);
      expect(response.body.serialNumber).toBe(testAsset.serialNumber);
      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.createdBy).toBe(user.id);
      expect(response.body.history).toBeDefined();
      expect(response.body.history.length).toBeGreaterThan(0);
    });

    it('should create asset with minimal required fields', async () => {
      const minimalAsset = {
        name: 'Minimal Asset',
        categoryId: 'cat-123',
        departmentId: 'dept-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(minimalAsset)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('Minimal Asset');
      expect(response.body.assetId).toMatch(/^AST-\d+$/);
    });

    it('should generate sequential asset IDs', async () => {
      const asset1Response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testAsset, name: 'Asset 1' })
        .expect(201);

      const asset2Response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...testAsset, name: 'Asset 2' })
        .expect(201);

      const assetId1 = parseInt(asset1Response.body.assetId.split('-')[1]);
      const assetId2 = parseInt(asset2Response.body.assetId.split('-')[1]);

      expect(assetId2).toBeGreaterThan(assetId1);
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .send(testAsset)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should fail with missing required fields', async () => {
      const incompleteAsset = {
        name: 'Incomplete Asset',
        // Missing categoryId and departmentId
      };

      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteAsset)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should create asset with history record', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset)
        .expect(201);

      const createdAsset = await assetsRepository.findOne({
        where: { id: response.body.id },
        relations: ['history'],
      });

      expect(createdAsset.history).toBeDefined();
      expect(createdAsset.history.length).toBe(1);
      expect(createdAsset.history[0].action).toBe('CREATED');
      expect(createdAsset.history[0].performedBy).toBe(user.id);
    });

    it('should store asset with correct data types', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset)
        .expect(201);

      expect(typeof response.body.createdAt).toBe('string');
      expect(typeof response.body.updatedAt).toBe('string');
      expect(response.body.purchasePrice).toBeDefined();
      expect(response.body.currentValue).toBeDefined();
    });
  });

  describe('GET /api/assets - List Assets', () => {
    let assetIds: string[] = [];

    beforeEach(async () => {
      // Create multiple test assets
      const assets = [
        { ...testAsset, name: 'Asset 1', condition: 'NEW', status: 'ACTIVE' },
        { ...testAsset, name: 'Asset 2', condition: 'GOOD', status: 'ACTIVE' },
        { ...testAsset, name: 'Asset 3', condition: 'FAIR', status: 'INACTIVE' },
        { ...testAsset, name: 'Asset 4', condition: 'POOR', status: 'MAINTENANCE' },
      ];

      for (const asset of assets) {
        const response = await request(app.getHttpServer())
          .post('/api/assets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(asset);
        assetIds.push(response.body.id);
      }
    });

    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
      assetIds = [];
    });

    it('should list all assets with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(4);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBeDefined();
    });

    it('should filter assets by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets?status=ACTIVE')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((asset) => {
        expect(asset.status).toBe('ACTIVE');
      });
    });

    it('should filter assets by condition', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets?condition=NEW')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((asset) => {
        expect(asset.condition).toBe('NEW');
      });
    });

    it('should search assets by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets?search=Asset')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((asset) => {
        expect(asset.name.toLowerCase()).toContain('asset');
      });
    });

    it('should paginate assets correctly', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/api/assets?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/api/assets?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response1.body.data.length).toBeLessThanOrEqual(2);
      expect(response2.body.data.length).toBeLessThanOrEqual(2);

      // Verify different assets
      if (response1.body.total > 2) {
        expect(response1.body.data[0].id).not.toBe(response2.body.data[0].id);
      }
    });

    it('should filter by categoryId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assets?categoryId=${testAsset.categoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      response.body.data.forEach((asset) => {
        expect(asset.categoryId).toBe(testAsset.categoryId);
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets')
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('GET /api/assets/:id - Get Single Asset', () => {
    let assetId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset);
      assetId = response.body.id;
    });

    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should retrieve a single asset by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(assetId);
      expect(response.body.name).toBe(testAsset.name);
      expect(response.body.history).toBeDefined();
    });

    it('should include asset history', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toBeDefined();
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.history.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .get(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should validate UUID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/assets/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('PATCH /api/assets/:id - Update Asset', () => {
    let assetId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset);
      assetId = response.body.id;
    });

    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should update asset fields', async () => {
      const updateData = {
        name: 'Updated Asset Name',
        condition: 'FAIR',
        status: 'MAINTENANCE',
        currentValue: 500.00,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.condition).toBe(updateData.condition);
      expect(response.body.status).toBe(updateData.status);
      expect(response.body.currentValue).toBe(updateData.currentValue.toString());
    });

    it('should create history record on update', async () => {
      const updateData = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      const history = await historyRepository.find({
        where: { asset: { id: assetId } },
      });

      expect(history.length).toBe(2); // Creation + Update
      expect(history[1].action).toBe('UPDATED');
      expect(history[1].performedBy).toBe(user.id);
      expect(history[1].changes).toBeDefined();
    });

    it('should not create history record if no changes', async () => {
      const emptyUpdate = {};

      await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(emptyUpdate)
        .expect(200);

      const history = await historyRepository.find({
        where: { asset: { id: assetId } },
      });

      // Should still be 1 (only creation)
      expect(history.length).toBe(1);
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .send({ name: 'Test' })
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });

    it('should allow partial updates', async () => {
      const originalAsset = await assetsRepository.findOne({
        where: { id: assetId },
      });

      const updateData = { condition: 'DAMAGED' };

      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(originalAsset.name);
      expect(response.body.condition).toBe('DAMAGED');
    });
  });

  describe('DELETE /api/assets/:id - Soft Delete Asset', () => {
    let assetId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset);
      assetId = response.body.id;
    });

    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should soft delete an asset', async () => {
      await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify it's marked as deleted
      const deletedAsset = await assetsRepository.findOne({
        where: { id: assetId },
        withDeleted: true,
      });

      expect(deletedAsset.deletedAt).not.toBeNull();
    });

    it('should create history record on delete', async () => {
      await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const history = await historyRepository.find({
        where: { asset: { id: assetId } },
      });

      expect(history.length).toBe(2); // Creation + Deletion
      expect(history[1].action).toBe('DELETED');
      expect(history[1].performedBy).toBe(user.id);
    });

    it('should not appear in asset list after deletion', async () => {
      await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const response = await request(app.getHttpServer())
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const foundAsset = response.body.data.find((a) => a.id === assetId);
      expect(foundAsset).toBeUndefined();
    });

    it('should return 404 for non-existent asset', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app.getHttpServer())
        .delete(`/api/assets/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('not found');
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('POST /api/assets/:id/restore - Restore Asset', () => {
    let assetId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset);
      assetId = response.body.id;

      // Soft delete the asset
      await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    afterEach(async () => {
      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should restore a soft-deleted asset', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/assets/${assetId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body.id).toBe(assetId);
      expect(response.body.deletedAt).toBeNull();
    });

    it('should create history record on restore', async () => {
      await request(app.getHttpServer())
        .post(`/api/assets/${assetId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const history = await historyRepository.find({
        where: { asset: { id: assetId } },
      });

      expect(history.length).toBe(3); // Creation + Deletion + Restoration
      expect(history[2].action).toBe('RESTORED');
      expect(history[2].performedBy).toBe(user.id);
    });

    it('should appear in asset list after restoration', async () => {
      await request(app.getHttpServer())
        .post(`/api/assets/${assetId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const foundAsset = response.body.data.find((a) => a.id === assetId);
      expect(foundAsset).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/assets/${assetId}/restore`)
        .expect(401);

      expect(response.body.message).toContain('Unauthorized');
    });
  });

  describe('Assets Integration Scenarios', () => {
    it('should handle complete asset lifecycle', async () => {
      // 1. Create
      const createResponse = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset)
        .expect(201);

      const assetId = createResponse.body.id;

      // 2. Read
      const getResponse = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.name).toBe(testAsset.name);

      // 3. Update
      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'MAINTENANCE' })
        .expect(200);

      expect(updateResponse.body.status).toBe('MAINTENANCE');

      // 4. Delete
      await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // 5. Verify in list
      const listResponse = await request(app.getHttpServer())
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deletedAsset = listResponse.body.data.find((a) => a.id === assetId);
      expect(deletedAsset).toBeUndefined();

      // 6. Restore
      const restoreResponse = await request(app.getHttpServer())
        .post(`/api/assets/${assetId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(restoreResponse.body.deletedAt).toBeNull();

      // 7. Verify history
      const historyResponse = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.history.length).toBe(4); // Create, Update, Delete, Restore
    });

    it('should handle multiple concurrent asset creations', async () => {
      const assets = Array.from({ length: 5 }, (_, i) => ({
        ...testAsset,
        name: `Concurrent Asset ${i + 1}`,
      }));

      const requests = assets.map((asset) =>
        request(app.getHttpServer())
          .post('/api/assets')
          .set('Authorization', `Bearer ${authToken}`)
          .send(asset),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(`Concurrent Asset ${index + 1}`);
        expect(response.body.assetId).toBeDefined();
      });

      // Verify all were created
      const listResponse = await request(app.getHttpServer())
        .get('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.total).toBeGreaterThanOrEqual(5);

      await assetsRepository.delete({});
      await historyRepository.delete({});
    });

    it('should maintain referential integrity with history', async () => {
      // Create and update asset
      const createResponse = await request(app.getHttpServer())
        .post('/api/assets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testAsset)
        .expect(201);

      const assetId = createResponse.body.id;

      // Make multiple updates
      await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ condition: 'GOOD' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      // Verify history
      const response = await request(app.getHttpServer())
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history.length).toBe(3); // Create + 2 Updates
      response.body.history.forEach((record) => {
        expect(record.asset).toBeDefined();
        expect(record.performedBy).toBe(user.id);
      });

      await assetsRepository.delete({});
      await historyRepository.delete({});
    });
  });
});
