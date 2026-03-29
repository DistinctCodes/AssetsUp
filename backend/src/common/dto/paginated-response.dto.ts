export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const res = new PaginatedResponse<T>();
    res.data = data;
    res.total = total;
    res.page = page;
    res.limit = limit;
    res.totalPages = Math.ceil(total / limit);
    return res;
  }
}
