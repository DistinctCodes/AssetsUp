import { api } from '../api';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  password?: string;
}

export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

type ApiErrorLike = {
  response?: { status?: number; data?: { message?: string | string[] } };
};

/**
 * Turns a failed invite / role / active-state request into a specific,
 * user-facing message instead of a generic error.
 */
export function getUserActionErrorMessage(
  err: unknown,
  action: 'invite' | 'update' = 'update',
): string {
  const response = (err as ApiErrorLike)?.response;
  const status = response?.status;
  const raw = response?.data?.message;
  const serverMessage = Array.isArray(raw) ? raw.join(', ') : raw;

  switch (status) {
    case 409:
      return action === 'invite'
        ? 'A user with this email has already been invited.'
        : 'This change conflicts with the current state of the user.';
    case 403:
      return serverMessage || 'Only administrators can do this.';
    case 404:
      return 'User not found. They may have been removed.';
    case 400:
      return serverMessage || 'The request was invalid. Check the details and try again.';
    default:
      if (status && status >= 500) {
        return 'The server had a problem. Please try again in a moment.';
      }
      return serverMessage || 'Something went wrong. Please try again.';
  }
}

export const usersApiClient = {
  getUsers: (search?: string): Promise<AppUser[]> =>
    api.get<AppUser[]>('/users', { params: search ? { search } : undefined }).then((r) => r.data),

  updateRole: (id: string, role: UserRole): Promise<AppUser> =>
    api.patch<AppUser>(`/users/${id}/role`, { role }).then((r) => r.data),

  toggleActive: (id: string, isActive: boolean): Promise<AppUser> =>
    api.patch<AppUser>(`/users/${id}/active`, { isActive }).then((r) => r.data),

  inviteUser: (data: InviteUserInput): Promise<AppUser> =>
    api.post<AppUser>('/users/invite', data).then((r) => r.data),

  updateProfile: (data: UpdateProfileInput): Promise<AppUser> =>
    api.patch<AppUser>('/users/me', data).then((r) => r.data),
};
