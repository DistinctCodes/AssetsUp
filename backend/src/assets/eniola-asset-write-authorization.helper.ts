export type AssetWriteRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE' | string;
export type AssetWriteAction = 'create' | 'update' | 'delete';

export function canPerformAssetWrite(role: AssetWriteRole, action: AssetWriteAction): boolean {
  if (action === 'create' || action === 'update' || action === 'delete') {
    return role === 'ADMIN' || role === 'MANAGER';
  }
  return false;
}

export function assertAssetWriteAllowed(role: AssetWriteRole, action: AssetWriteAction): void {
  if (!canPerformAssetWrite(role, action)) {
    throw new Error(`Role ${role} is not allowed to ${action} assets`);
  }
}

export function assetWriteRoleMatrix(): Record<AssetWriteRole, Record<AssetWriteAction, boolean>> {
  return {
    ADMIN: { create: true, update: true, delete: true },
    MANAGER: { create: true, update: true, delete: true },
    EMPLOYEE: { create: false, update: false, delete: false },
  };
}
