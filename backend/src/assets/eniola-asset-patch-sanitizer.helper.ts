export const ENIOLA_PROTECTED_ASSET_PATCH_FIELDS = [
  'id',
  'status',
  'assetTag',
  'departmentId',
  'assignedToUserId',
  'createdAt',
  'updatedAt',
  'deletedAt',
] as const;

export interface PatchSanitizeResult<T extends Record<string, unknown>> {
  sanitized: T;
  rejectedFields: string[];
}

export function sanitizeAssetPatch<T extends Record<string, unknown>>(dto: T): PatchSanitizeResult<T> {
  const rejectedFields: string[] = [];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(dto ?? {})) {
    if ((ENIOLA_PROTECTED_ASSET_PATCH_FIELDS as readonly string[]).includes(key)) {
      rejectedFields.push(key);
      continue;
    }
    sanitized[key] = value;
  }
  return { sanitized: sanitized as T, rejectedFields };
}

export function assertNoProtectedAssetPatchFields(dto: Record<string, unknown>): void {
  const { rejectedFields } = sanitizeAssetPatch(dto);
  if (rejectedFields.length > 0) {
    throw new Error(`Protected fields cannot be updated via PATCH: ${rejectedFields.join(', ')}`);
  }
}
