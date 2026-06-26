import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'permissions';
export const RequirePermissions = (...permissions: string[]) => SetMetadata(ROLES_KEY, permissions);
