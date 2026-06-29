import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';

describe('Licenses (e2e)', () => {
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

  it('GET /api/licenses returns 401 without auth', () => {
    return request(app.getHttpServer()).get('/api/licenses').expect(401);
  });

  it('POST /api/licenses returns 401 without auth', () => {
    return request(app.getHttpServer())
      .post('/api/licenses')
      .send({ name: 'Test License' })
      .expect(401);
  });
});
