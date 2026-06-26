import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

const mockRepo = { create: jest.fn(), save: jest.fn(), findOne: jest.fn() };
const mockUsersService = { findByEmail: jest.fn(), update: jest.fn(), create: jest.fn() };
const mockMailService = { sendPasswordResetEmail: jest.fn() };
const mockConfig = { get: jest.fn((key: string, def?: string) => def ?? 'http://localhost:3000') };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: MailService, useValue: mockMailService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getRepositoryToken(PasswordResetToken), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('returns silently if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.forgotPassword('no@email.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates reset token and sends email when user exists', async () => {
      const user = { id: 'u1', email: 'test@example.com' };
      mockUsersService.findByEmail.mockResolvedValue(user);
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockResolvedValue({});
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      await service.forgotPassword('test@example.com');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', expect.stringContaining('reset-password'));
    });
  });

  describe('resetPassword', () => {
    it('throws BadRequestException for invalid token format', async () => {
      await expect(service.resetPassword('invalidtoken', 'newpass')).rejects.toThrow('Invalid token format');
    });

    it('throws BadRequestException when token not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.resetPassword('id.rawtoken', 'newpass')).rejects.toThrow();
    });
  });

  describe('validateOAuthLogin', () => {
    it('returns tokens and creates new user if not found', async () => {
      const profile = { id: 'g1', emails: [{ value: 'new@example.com' }] };
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ id: 'u2', email: 'new@example.com', googleId: 'g1' });
      const result = await service.validateOAuthLogin(profile);
      expect(result).toHaveProperty('accessToken');
      expect(mockUsersService.create).toHaveBeenCalled();
    });

    it('updates googleId on existing user without one', async () => {
      const profile = { id: 'g2', emails: [{ value: 'exists@example.com' }] };
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u3', email: 'exists@example.com', googleId: null });
      mockUsersService.update.mockResolvedValue({ id: 'u3', googleId: 'g2' });
      await service.validateOAuthLogin(profile);
      expect(mockUsersService.update).toHaveBeenCalledWith('u3', { googleId: 'g2' });
    });
  });
});