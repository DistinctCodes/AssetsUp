export interface Department {
    id: string;
    name: string;
    description?: string;
    managerId?: string;
    parentDepartmentId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateDepartmentDto {
    name: string;
    description?: string;
    managerId?: string;
    parentDepartmentId?: string;
  }