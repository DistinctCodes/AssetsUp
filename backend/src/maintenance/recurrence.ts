export const RECURRENCE_FREQUENCIES = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  count?: number;
  until?: Date | string | null;
}

export interface RecurrenceOptions {
  now?: Date;
  maxOccurrences?: number;
}

export const DEFAULT_MAX_OCCURRENCES = 100;

function toDate(value: Date | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function advance(date: Date, frequency: RecurrenceFrequency, interval = 1): Date {
  const step = Math.max(1, Math.floor(interval));
  const result = new Date(date.getTime());
  switch (frequency) {
    case 'DAILY':
      result.setUTCDate(result.getUTCDate() + step);
      return result;
    case 'WEEKLY':
      result.setUTCDate(result.getUTCDate() + 7 * step);
      return result;
    case 'MONTHLY':
      return addMonths(result, step);
    case 'QUARTERLY':
      return addMonths(result, 3 * step);
    case 'YEARLY':
      return addMonths(result, 12 * step);
  }
}

export function generateOccurrences(
  start: Date | string,
  rule: RecurrenceRule,
  options: RecurrenceOptions = {},
): Date[] {
  const first = toDate(start);
  if (first === null) return [];

  const now = options.now ?? new Date();
  const until = toDate(rule.until);
  const limit = Math.min(
    options.maxOccurrences ?? DEFAULT_MAX_OCCURRENCES,
    rule.count ?? Number.POSITIVE_INFINITY,
  );
  if (limit <= 0) return [];

  const occurrences: Date[] = [];
  let current = first;
  while (occurrences.length < limit) {
    if (until !== null && current.getTime() > until.getTime()) break;
    if (current.getTime() >= now.getTime()) occurrences.push(new Date(current.getTime()));
    current = advance(current, rule.frequency, rule.interval);
  }
  return occurrences;
}

export function nextOccurrence(
  start: Date | string,
  rule: RecurrenceRule,
  options: RecurrenceOptions = {},
): Date | null {
  return generateOccurrences(start, rule, { ...options, maxOccurrences: 1 })[0] ?? null;
}
