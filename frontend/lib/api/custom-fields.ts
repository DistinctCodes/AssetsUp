import { api } from '../api';

export interface CustomFieldDef {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
  isActive: boolean;
}

export const customFieldsApiClient = {
  list: (category: string): Promise<CustomFieldDef[]> =>
    api.get<CustomFieldDef[]>('/custom-fields', { params: { category } }).then((r) => r.data),
  create: (category: string, data: Omit<CustomFieldDef, 'id' | 'isActive'>): Promise<CustomFieldDef> =>
    api.post<CustomFieldDef>('/custom-fields', { ...data, category }).then((r) => r.data),
  update: (id: string, data: Partial<CustomFieldDef>): Promise<CustomFieldDef> =>
    api.patch<CustomFieldDef>(`/custom-fields/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> =>
    api.delete(`/custom-fields/${id}`).then(() => undefined),
  toggleActive: (id: string, isActive: boolean): Promise<CustomFieldDef> =>
    api.patch<CustomFieldDef>(`/custom-fields/${id}`, { isActive }).then((r) => r.data),
};