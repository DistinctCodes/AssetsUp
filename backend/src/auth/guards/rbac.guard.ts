import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.getAllAndOverride<{ resource: string; action: string }>(
      'require_permission',
      [context.getHandler(), context.getClass()],
    );
    
    if (!requiredPermission) {
      return true; // No specific permission required, allow access
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false; // No authenticated user
    }

    // Check if user's role has the required permission
    if (!user.role || !user.role.permissions) {
      return false;
    }

    const hasPermission = user.role.permissions.some(
      (permission) => 
        permission.resource === requiredPermission.resource && 
        permission.action === requiredPermission.action
    );

    return hasPermission;
  }
}