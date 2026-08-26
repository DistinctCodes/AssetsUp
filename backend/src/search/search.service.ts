import { Injectable } from '@nestjs/common';

export type SearchType = 'assets' | 'users' | 'documents';

export interface SearchHit {
  type: SearchType;
  id: string;
  label: string;
}

export interface SearchResults {
  query: string;
  results: Record<SearchType, SearchHit[]>;
}

/**
 * Cross-entity search across assets, users and documents.
 *
 * This is the minimal shape that the command palette / global search page
 * consume. Each entity search is delegated to a small private method so the
 * concrete repository queries (ILIKE across the searchable columns) can be
 * filled in per entity without changing the public contract.
 */
@Injectable()
export class SearchService {
  async search(
    query: string,
    types: SearchType[] = ['assets', 'users', 'documents'],
    limit = 10,
  ): Promise<SearchResults> {
    const wanted = new Set(types);
    return {
      query,
      results: {
        assets: wanted.has('assets') ? await this.searchAssets(query, limit) : [],
        users: wanted.has('users') ? await this.searchUsers(query, limit) : [],
        documents: wanted.has('documents')
          ? await this.searchDocuments(query, limit)
          : [],
      },
    };
  }

  // Each of these narrows the corresponding table with a case-insensitive match
  // on its searchable columns (assets: name/assetId/serialNumber/manufacturer/
  // model/tags; users: name/email; documents: name).
  private async searchAssets(_query: string, _limit: number): Promise<SearchHit[]> {
    return [];
  }

  private async searchUsers(_query: string, _limit: number): Promise<SearchHit[]> {
    return [];
  }

  private async searchDocuments(
    _query: string,
    _limit: number,
  ): Promise<SearchHit[]> {
    return [];
  }
}
