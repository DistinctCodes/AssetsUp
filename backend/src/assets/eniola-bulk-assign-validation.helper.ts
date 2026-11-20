export type AssignableAssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_MAINTENANCE' | 'RETIRED' | 'DISPOSED' | 'LOST' | string;

export interface BulkAssignInput {
  ids: string[];
  userId?: string;
  departmentId?: string;
}

export interface BulkAssignContext {
  existingAssetIds: Set<string>;
  existingUserIds: Set<string>;
  existingDepartmentIds: Set<string>;
  assetStatuses: Record<string, AssignableAssetStatus>;
}

export interface BulkAssignPlan {
  assignableIds: string[];
  failed: Array<{ id: string; reason: string }>;
}

const TERMINAL = new Set(['RETIRED', 'DISPOSED', 'LOST']);

export function planBulkAssign(input: BulkAssignInput, ctx: BulkAssignContext): BulkAssignPlan {
  const failed: Array<{ id: string; reason: string }> = [];
  const assignableIds: string[] = [];
  if (input.userId && !ctx.existingUserIds.has(input.userId)) {
    input.ids.forEach((id) => failed.push({ id, reason: 'Unknown userId' }));
    return { assignableIds, failed };
  }
  if (input.departmentId && !ctx.existingDepartmentIds.has(input.departmentId)) {
    input.ids.forEach((id) => failed.push({ id, reason: 'Unknown departmentId' }));
    return { assignableIds, failed };
  }
  for (const id of input.ids) {
    if (!ctx.existingAssetIds.has(id)) {
      failed.push({ id, reason: 'Asset not found' });
      continue;
    }
    const status = ctx.assetStatuses[id];
    if (TERMINAL.has(status)) {
      failed.push({ id, reason: `Asset status ${status} cannot be assigned` });
      continue;
    }
    assignableIds.push(id);
  }
  return { assignableIds, failed };
}
