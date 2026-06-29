import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('PurchaseOrders (e2e)', () => {
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

  it('GET /api/purchase-orders returns 401 without auth', () => {
    return request(app.getHttpServer()).get('/api/purchase-orders').expect(401);
  });

  it('POST /api/purchase-orders returns 401 without auth', () => {
    return request(app.getHttpServer())
      .post('/api/purchase-orders')
      .send({ vendor: 'Test Vendor' })
      .expect(401);
  });
});
