import { api } from '../api';

export interface SearchResult {
  id: string;
  type: 'asset' | 'user' | 'document';
  title: string;
  subtitle: string;
  href: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export const searchApiClient = {
  search: (query: string): Promise<SearchResult[]> =>
    api
      .get<SearchResponse>('/search', { params: { q: query } })
      .then((r) => r.data.results ?? []),
};