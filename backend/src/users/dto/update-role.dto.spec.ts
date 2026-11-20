import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateRoleDto } from './update-role.dto';
import { UserRole } from '../entities/user.entity';

const build = (role: unknown) => plainToInstance(UpdateRoleDto, { role });

describe('UpdateRoleDto', () => {
  it.each([
    ['ADMIN', UserRole.ADMIN],
    ['MANAGER', UserRole.MANAGER],
    ['EMPLOYEE', UserRole.EMPLOYEE],
    ['manager', UserRole.MANAGER],
    ['MANAGER ', UserRole.MANAGER],
    ['staff', UserRole.EMPLOYEE],
    ['Admin', UserRole.ADMIN],
  ])('accepts %p as %p', async (input, expected) => {
    const dto = build(input);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.role).toBe(expected);
  });

  it.each(['superuser', '', 'owner', undefined, 7, null])(
    'rejects %p',
    async (input) => {
      expect((await validate(build(input))).length).toBeGreaterThan(0);
    },
  );
});
