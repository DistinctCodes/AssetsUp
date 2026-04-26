import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/users/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const testUser = {
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'TestPassword123!',
    role: UserRole.STAFF,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    await app.init();

    usersRepository = moduleFixture.get('UserRepository');
    jwtService = moduleFixture.get(JwtService);
    configService = moduleFixture.get(ConfigService);

    // Clean up test data
    await usersRepository.delete({});
  });

  afterAll(async () => {
    await usersRepository.delete({});
    await app.close();
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;
    let user: User;

    beforeEach(async () => {
      // Create a test user
      user = usersRepository.create({
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        password: await bcrypt.hash(testUser.password, 10),
        role: testUser.role,
      });
      await usersRepository.save(user);

      // Generate tokens
      const payload = { sub: user.id, email: user.email };
      accessToken = await jwtService.signAsync(payload, {
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      });

      refreshToken = await jwtService.signAsync(payload, {
        secret: configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      // Save hashed refresh token
      const hashedRefresh = await bcrypt.hash(refreshToken, 10);
      user.refreshToken = hashedRefresh;
      await usersRepository.save(user);
    });

    afterEach(async () => {
      await usersRepository.delete({});
    });

    it('should successfully refresh tokens with valid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(typeof response.body.accessToken).toBe('string');
      expect(typeof response.body.refreshToken).toBe('string');

      // Verify the new access token is valid
      const decoded = jwtService.verify(response.body.accessToken, {
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      });
      expect(decoded.sub).toBe(user.id);
      expect(decoded.email).toBe(user.email);
    });

    it('should fail to refresh without Bearer token header', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .expect(401);

      expect(response.body.message).toContain('Missing Bearer token');
    });

    it('should fail to refresh with invalid token format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.message).toContain('Missing Bearer token');
    });

    it('should fail to refresh with expired token', async () => {
      // Create an expired token
      const expiredPayload = { sub: user.id, email: user.email };
      const expiredRefreshToken = await jwtService.signAsync(expiredPayload, {
        secret: configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '-1h', // Expired
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${expiredRefreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired refresh token');
    });

    it('should fail to refresh with invalid signature', async () => {
      // Create a token with different secret
      const invalidPayload = { sub: user.id, email: user.email };
      const invalidRefreshToken = await jwtService.signAsync(invalidPayload, {
        secret: 'WrongSecret',
        expiresIn: '7d',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${invalidRefreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired refresh token');
    });

    it('should fail to refresh when user does not exist', async () => {
      // Create a token for a non-existent user
      const fakeUserId = '00000000-0000-0000-0000-000000000000';
      const payload = { sub: fakeUserId, email: 'nonexistent@example.com' };
      const fakeRefreshToken = await jwtService.signAsync(payload, {
        secret: configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${fakeRefreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('User not found or token revoked');
    });

    it('should fail to refresh when refresh token has been revoked', async () => {
      // Clear the refresh token in the database
      user.refreshToken = null;
      await usersRepository.save(user);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('User not found or token revoked');
    });

    it('should fail to refresh when token hash does not match', async () => {
      // Change the stored refresh token hash
      user.refreshToken = await bcrypt.hash('differenttoken', 10);
      await usersRepository.save(user);

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(401);

      expect(response.body.message).toContain('Refresh token mismatch');
    });

    it('should return new tokens with updated timestamps', async () => {
      const firstResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      // Use the new refresh token to get another set
      await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure different timestamps

      const secondResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${firstResponse.body.refreshToken}`);

      expect(secondResponse.status).toBe(201);
      expect(secondResponse.body.accessToken).not.toBe(firstResponse.body.accessToken);
      expect(secondResponse.body.refreshToken).not.toBe(firstResponse.body.refreshToken);
    });

    it('should maintain user identity across token refreshes', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`);

      const oldDecoded = jwtService.verify(accessToken, {
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        ignoreExpiration: true,
      });

      const newDecoded = jwtService.verify(response.body.accessToken, {
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      });

      expect(newDecoded.sub).toBe(oldDecoded.sub);
      expect(newDecoded.email).toBe(oldDecoded.email);
    });
  });

  describe('Auth Integration Scenarios', () => {
    it('should handle multiple concurrent refresh requests', async () => {
      // Create a test user
      const user = usersRepository.create({
        email: 'concurrent@example.com',
        firstName: 'John',
        lastName: 'Doe',
        password: await bcrypt.hash('TestPassword123!', 10),
        role: UserRole.STAFF,
      });
      await usersRepository.save(user);

      // Generate tokens
      const payload = { sub: user.id, email: user.email };
      const refreshToken = await jwtService.signAsync(payload, {
        secret: configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      });

      const hashedRefresh = await bcrypt.hash(refreshToken, 10);
      user.refreshToken = hashedRefresh;
      await usersRepository.save(user);

      // Make multiple concurrent requests
      const requests = [
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${refreshToken}`),
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${refreshToken}`),
        request(app.getHttpServer())
          .post('/api/auth/refresh')
          .set('Authorization', `Bearer ${refreshToken}`),
      ];

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('accessToken');
        expect(response.body).toHaveProperty('refreshToken');
      });

      await usersRepository.delete({ id: user.id });
    });
  });
});
