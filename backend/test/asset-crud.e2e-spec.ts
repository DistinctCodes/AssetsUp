import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Asset CRUD (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns 200', () => {
    return request(app.getHttpServer()).get('/').expect(200);
  });

  it('POST /auth/forgot-password returns 200 for any email', () => {
    return request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'nonexistent@test.com' })
      .expect(200);
  });

  it('POST /auth/reset-password returns 400 for invalid token', () => {
    return request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token: 'bad-token', newPassword: 'newpass123' })
      .expect(400);
  });
});