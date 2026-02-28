import { api } from '../api';

export type UserRole = 'admin' | 'manager' | 'staff';

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  password?: string;
}

export const usersApiClient = {
  getUsers: (search?: string): Promise<AppUser[]> =>
    api.get<AppUser[]>('/users', { params: search ? { search } : undefined }).then((r) => r.data),

  updateRole: (id: string, role: UserRole): Promise<AppUser> =>
    api.patch<AppUser>(`/users/${id}/role`, { role }).then((r) => r.data),

  updateProfile: (data: UpdateProfileInput): Promise<AppUser> =>
    api.patch<AppUser>('/users/me', data).then((r) => r.data),
};
