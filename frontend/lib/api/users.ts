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
