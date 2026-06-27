import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Contracts (e2e)', () => {
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

  it('GET /api/contracts returns 401 without auth', () => {
    return request(app.getHttpServer())
      .get('/api/contracts')
      .expect(401);
  });

  it('POST /api/contracts returns 401 without auth', () => {
    return request(app.getHttpServer())
      .post('/api/contracts')
      .send({ title: 'Test', vendor: 'Test Vendor' })
      .expect(401);
  });
});
