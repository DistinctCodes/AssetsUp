import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';

// Defaults match the Postgres service container in CI; override locally via env.
process.env.JWT_SECRET ??= 'e2e-jwt-secret-that-is-at-least-32-chars';
process.env.JWT_REFRESH_SECRET ??= 'e2e-refresh-secret-that-is-at-least-32-chars';
process.env.BCRYPT_ROUNDS ??= '4';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USERNAME ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_DATABASE ??= 'assetsup_test';

// Imported after the env defaults above so AppModule reads them.
// eslint-disable-next-line import/first
import { AppModule } from '../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password123!';
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // Mirror main.ts so guards, pipes and the response envelope are real.
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    // The app runs with synchronize:false and the repo has no baseline
    // migration, so build the schema directly for the throwaway test DB.
    await app.get(DataSource).synchronize(true);
  });

  afterAll(async () => {
    await app?.close();
  });

  const http = () => request(app.getHttpServer());

  describe('auth', () => {
    it('registers a user and returns tokens inside the envelope', async () => {
      const res = await http()
        .post('/api/auth/register')
        .send({ firstName: 'E', lastName: 'Two', email, password })
        .expect(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(email);
    });

    it('rejects a duplicate email with 409', async () => {
      await http()
        .post('/api/auth/register')
        .send({
          firstName: 'E',
          lastName: 'Two',
          email,
          password,
        })
        .expect(409);
    });

    it('rejects an over-long password with 400', async () => {
      await http()
        .post('/api/auth/register')
        .send({
          firstName: 'E',
          lastName: 'Two',
          email: 'long@example.com',
          password: 'x'.repeat(100),
        })
        .expect(400);
    });

    it('logs in with valid credentials', async () => {
      const res = await http()
        .post('/api/auth/login')
        .send({ email, password })
        .expect(200);
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
      expect(accessToken).toBeDefined();
    });

    it('rejects a wrong password with 401', async () => {
      await http()
        .post('/api/auth/login')
        .send({ email, password: 'nope-nope-nope' })
        .expect(401);
    });

    it('refreshes the token pair', async () => {
      const res = await http()
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.data.accessToken).toBeDefined();
      accessToken = res.body.data.accessToken;
    });
  });

  describe('authorization', () => {
    it('returns 401 for a protected route without a token', async () => {
      await http().get('/api/users/me').expect(401);
    });

    it('returns the profile with a valid token', async () => {
      const res = await http()
        .get('/api/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data.email).toBe(email);
    });

    it('returns 403 when an EMPLOYEE calls an ADMIN-only route', async () => {
      await http()
        .delete('/api/assets/bulk')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ids: [] })
        .expect(403);
    });
  });

  describe('assets', () => {
    let assetId: string;

    it('creates, reads, updates and deletes an asset', async () => {
      const created = await http()
        .post('/api/assets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Laptop' })
        .expect(201);
      assetId = created.body.data.id;
      expect(created.body.data.assetTag).toMatch(/^AST-/);

      const read = await http()
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(read.body.data.name).toBe('E2E Laptop');

      await http()
        .patch(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'E2E Laptop v2' })
        .expect(200);

      await http()
        .delete(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      await http()
        .get(`/api/assets/${assetId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('requires a token for guarded asset routes', async () => {
      await http().get('/api/assets/anything/availability').expect(401);
    });
  });
});
