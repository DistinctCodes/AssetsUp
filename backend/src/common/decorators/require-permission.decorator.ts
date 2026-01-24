import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (resource: string, action: string) =>
  SetMetadata('require_permission', { resource, action });