/** The envelope the backend's list endpoints return inside `data` (users, vendors, purchase orders, departments, ...). */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PageParams {
  page?: number;
  limit?: number;
  search?: string;
}

/** The backend caps `limit` at 100; "option lists" for selects ask for that many. */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export const emptyPage = <T>(): Paginated<T> => ({
  items: [],
  total: 0,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  totalPages: 0,
});
