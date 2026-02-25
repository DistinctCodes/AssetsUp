import apiClient from './client';
import { User } from '../users';

export async function getUsers(): Promise<User[]> {
  const res = await apiClient.get('/users');
  return res.data;
}

export async function updateUserRole(id: string, role: string): Promise<User> {
  const res = await apiClient.patch(`/users/${id}/role`, { role });
  return res.data;
}

export async function updateProfile(id: string, payload: Partial<User>): Promise<User> {
  const res = await apiClient.patch(`/users/${id}`, payload);
  return res.data;
}
