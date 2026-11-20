export interface LicenseSeatState {
  id: string;
  seatsUsed: number;
  totalSeats?: number;
}

export interface SeatAssignmentRef {
  id: string;
  licenseId: string;
  active: boolean;
}

export function canDeleteLicense(
  license: LicenseSeatState,
  assignments: SeatAssignmentRef[],
): { ok: boolean; reason?: string } {
  const active = assignments.filter((a) => a.licenseId === license.id && a.active);
  if (active.length > 0 || license.seatsUsed > 0) {
    return { ok: false, reason: 'Cannot delete a license with active seat assignments' };
  }
  return { ok: true };
}

export function applySeatUnassign(
  license: LicenseSeatState,
  assignments: SeatAssignmentRef[],
  assignmentId: string,
): { license: LicenseSeatState; assignments: SeatAssignmentRef[]; changed: boolean } {
  let changed = false;
  const nextAssignments = assignments.map((a) => {
    if (a.id !== assignmentId || a.licenseId !== license.id || !a.active) return a;
    changed = true;
    return { ...a, active: false };
  });
  const nextLicense = changed
    ? { ...license, seatsUsed: Math.max(0, license.seatsUsed - 1) }
    : { ...license };
  return { license: nextLicense, assignments: nextAssignments, changed };
}
