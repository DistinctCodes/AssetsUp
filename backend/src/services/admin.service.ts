import axios from 'axios';
import { User, Role } from '../types/admin';

const api = axios.create({ baseURL: '/api' });

export const AdminService = {
  getUsers: () => api.get<User[]>('/users'),
  createUser: (data: Partial<User>) => api.post('/users', data),
  updateUser: (id: string, data: Partial<User>) =>
    api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  getRoles: () => api.get<Role[]>('/roles'),
  updatePermissions: (roleId: string, permissions: string[]) =>
    api.put(`/roles/${roleId}/permissions`, { permissions }),
};
