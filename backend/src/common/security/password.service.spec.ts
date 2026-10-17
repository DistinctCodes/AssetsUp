import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { validate } from 'class-validator';
import { RegisterDto } from '../../auth/dto/register.dto';
import { UpdateProfileDto } from '../../users/dto/update-profile.dto';
import {
  DEFAULT_BCRYPT_ROUNDS,
  MAX_PASSWORD_BYTES,
  PasswordService,
} from './password.service';

const config = (rounds?: unknown) =>
  ({ get: () => rounds }) as unknown as import('@nestjs/config').ConfigService;

describe('PasswordService', () => {
  it('defaults to cost 12 and reads BCRYPT_ROUNDS when valid', () => {
    expect(new PasswordService().rounds).toBe(DEFAULT_BCRYPT_ROUNDS);
    expect(new PasswordService(config('10')).rounds).toBe(10);
  });

  it.each(['abc', '1', '99', undefined])(
    'falls back to the default for invalid BCRYPT_ROUNDS %p',
    (bad) => {
      expect(new PasswordService(config(bad)).rounds).toBe(
        DEFAULT_BCRYPT_ROUNDS,
      );
    },
  );

  it('hashes with the configured cost and verifies', async () => {
    const svc = new PasswordService(config(4));
    const hash = await svc.hash('Password123!');
    expect(bcrypt.getRounds(hash)).toBe(4);
    await expect(svc.compare('Password123!', hash)).resolves.toBe(true);
    await expect(svc.compare('wrong', hash)).resolves.toBe(false);
  });

  it('still verifies existing hashes made at a different cost (cost 10)', async () => {
    const legacy = await bcrypt.hash('Legacy-Pass-1', 10);
    const svc = new PasswordService(config(4));
    await expect(svc.compare('Legacy-Pass-1', legacy)).resolves.toBe(true);
  });

  it('rejects passwords over 72 bytes, counting multi-byte characters', async () => {
    const svc = new PasswordService(config(4));
    await expect(svc.hash('a'.repeat(MAX_PASSWORD_BYTES + 1))).rejects.toThrow(
      BadRequestException,
    );
    // 37 two-byte characters = 74 bytes but only 37 characters.
    await expect(svc.hash('é'.repeat(37))).rejects.toThrow(BadRequestException);
    await expect(svc.hash('a'.repeat(MAX_PASSWORD_BYTES))).resolves.toBeTruthy();
  });

  it('does not match an empty password or hash', async () => {
    await expect(new PasswordService().compare('', 'x')).resolves.toBe(false);
  });
});

describe('password DTO limits', () => {
  const base = { firstName: 'A', lastName: 'B', email: 'a@b.com' };

  it('rejects a megabyte-long password at validation time', async () => {
    const dto = Object.assign(new RegisterDto(), {
      ...base,
      password: 'x'.repeat(1_000_000),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });

  it('accepts a normal password', async () => {
    const dto = Object.assign(new RegisterDto(), {
      ...base,
      password: 'Password123!',
    });
    expect(await validate(dto)).toEqual([]);
  });

  it('applies the same cap to profile password changes', async () => {
    const dto = Object.assign(new UpdateProfileDto(), {
      newPassword: 'é'.repeat(40),
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'newPassword')).toBe(true);
  });
});
