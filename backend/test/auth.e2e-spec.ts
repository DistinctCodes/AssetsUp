import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/login', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'invalid@test.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 200 for any email', () => {
      return request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@example.com' })
        .expect(200);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should return 400 for invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'newpass123' })
        .expect(400);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 201 with valid data', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(201);
    });
  });
});
