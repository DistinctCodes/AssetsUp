/** Escapes `%`, `_` and `\` so user input is matched literally by LIKE/ILIKE. */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, '\\$&');
}

/** `%term%` pattern with the term escaped; pair with `ESCAPE '\'` in SQL. */
export function containsPattern(term: string): string {
  return `%${escapeLike(term)}%`;
}

export const LIKE_ESCAPE = "ESCAPE '\\'";

/**
 * Picks a sortable column from a whitelist and a direction. Unknown input
 * falls back to the default, so a client can never inject a column name.
 */
export function resolveSort(
  sortBy: string | undefined,
  sortOrder: string | undefined,
  allowed: readonly string[],
  defaultColumn: string,
): { column: string; order: 'ASC' | 'DESC' } {
  const column = sortBy && allowed.includes(sortBy) ? sortBy : defaultColumn;
  const order = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { column, order };
}
