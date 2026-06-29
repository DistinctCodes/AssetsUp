import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Locations (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let locationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'admin123' });

    authToken = loginRes.body.data?.accessToken || loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /locations', () => {
    it('should create a location', () => {
      return request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Main Office', city: 'New York' })
        .expect(201)
        .then((res) => {
          locationId = res.body.data?.id || res.body.id;
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .post('/locations')
        .send({ name: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('GET /locations', () => {
    it('should return paginated locations', () => {
      return request(app.getHttpServer())
        .get('/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('GET /locations/:id', () => {
    it('should return a location by id', () => {
      return request(app.getHttpServer())
        .get(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should return 404 for non-existent id', () => {
      return request(app.getHttpServer())
        .get('/locations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /locations/:id', () => {
    it('should update a location', () => {
      return request(app.getHttpServer())
        .put(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ city: 'San Francisco' })
        .expect(200);
    });
  });

  describe('DELETE /locations/:id', () => {
    it('should delete a location', () => {
      return request(app.getHttpServer())
        .delete(`/locations/${locationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
