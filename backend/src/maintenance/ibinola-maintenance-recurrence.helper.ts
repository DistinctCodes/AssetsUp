import { advance, nextOccurrence, RecurrenceRule } from './recurrence';

export interface RecurringMaintenanceSeed {
  assetId?: string;
  title: string;
  description?: string | null;
  recurrence: RecurrenceRule;
  referenceDate: Date | string;
  status?: string;
}

export interface ScheduledMaintenanceRecord {
  title: string;
  description: string | null;
  assetId?: string;
  status: 'SCHEDULED';
  scheduledDate: Date;
}

export function computeNextMaintenanceDate(
  referenceDate: Date | string,
  recurrence: RecurrenceRule,
  now: Date = new Date(),
): Date | null {
  const candidate = nextOccurrence(referenceDate, recurrence, { now });
  if (candidate) return candidate;
  const base = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  if (Number.isNaN(base.getTime())) return null;
  return advance(base, recurrence.frequency, recurrence.interval ?? 1);
}

export function scheduleNextRecurringMaintenance(
  seed: RecurringMaintenanceSeed,
  now: Date = new Date(),
): ScheduledMaintenanceRecord | null {
  if (!seed?.recurrence) return null;
  const scheduledDate = computeNextMaintenanceDate(seed.referenceDate, seed.recurrence, now);
  if (!scheduledDate) return null;
  return {
    title: seed.title,
    description: seed.description ?? null,
    ...(seed.assetId ? { assetId: seed.assetId } : {}),
    status: 'SCHEDULED',
    scheduledDate,
  };
}
