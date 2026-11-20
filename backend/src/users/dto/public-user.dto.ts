import { User } from '../entities/user.entity';

/**
 * The few user fields other people's records may show: who is assigned to an
 * asset, who performed a history event, who made a reservation. Built by
 * explicit mapping so a user column added later (or a secret that already
 * exists) can never ride along on a relation.
 */
export interface PublicUserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export function toPublicUserRef(
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null | undefined,
): PublicUserRef | null {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
  };
}
