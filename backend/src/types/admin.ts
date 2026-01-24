export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'active' | 'inactive';
  lastActive: string;
};

export type Role = {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean; // Cannot delete
};

export type Permission = {
  id: string;
  category: 'Assets' | 'Departments' | 'Reports' | 'Users' | 'Settings';
  action: string; // e.g., 'view', 'create'
  name: string; // Display name
};

export type RolePermission = Record<string, string[]>; // roleId -> permissionIds[]
