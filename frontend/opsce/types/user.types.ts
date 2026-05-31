export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    MANAGER = 'manager',
    STAFF = 'staff',
    VIEWER = 'viewer',
  }
  
  export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    departmentId?: string;
    avatarUrl?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface UpdateUserDto {
    name?: string;
    email?: string;
    role?: UserRole;
    departmentId?: string;
    avatarUrl?: string;
    isActive?: boolean;
  }
  
  export interface UserResponse {
    data: User;
  }