import { UserRole } from '../entities/user.entity';

// The frontend sends lowercase role names ("staff"); accept those as well as
// the canonical enum values.
const ROLE_ALIASES: Record<string, UserRole> = {
  admin: UserRole.ADMIN,
  manager: UserRole.MANAGER,
  staff: UserRole.EMPLOYEE,
  employee: UserRole.EMPLOYEE,
};

/** Maps a role string (any case, plus the "staff" alias) to a UserRole; unknown values pass through for validation to reject. */
export function normalizeRole(value: unknown): unknown {
  return typeof value === 'string'
    ? (ROLE_ALIASES[value.trim().toLowerCase()] ?? value)
    : value;
}
