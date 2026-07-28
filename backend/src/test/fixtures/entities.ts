/**
 * Entity fixtures for testing
 * These provide consistent test data across the test suite
 */

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'hashedPassword',
  role: 'ADMIN',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockAsset = {
  id: '1',
  assetId: 'AST-001',
  name: 'Dell Laptop',
  description: 'Dell XPS 15 Laptop',
  serialNumber: 'SN12345',
  purchaseDate: new Date('2024-01-01'),
  purchasePrice: 1500,
  currentValue: 1200,
  status: 'ACTIVE',
  condition: 'GOOD',
  categoryId: '1',
  departmentId: '1',
  location: 'Office Floor 2',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockDepartment = {
  id: '1',
  name: 'IT Department',
  description: 'Information Technology Department',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockCategory = {
  id: '1',
  name: 'Computers',
  description: 'Computer equipment',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
