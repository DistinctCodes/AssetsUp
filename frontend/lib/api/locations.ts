import { api } from '../api';

export enum LocationType {
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  ROOM = 'ROOM',
  STORAGE = 'STORAGE',
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  address?: string | null;
  parentLocationId?: string | null;
  branchId?: string | null;
  assetCount: number;
  totalAssetCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationInput {
  name: string;
  code: string;
  type?: LocationType;
  address?: string;
  parentLocationId?: string;
  branchId?: string;
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {}

export interface LocationOption {
  id: string;
  label: string;
  depth: number;
}

/** Flattens locations into a depth-first, indentable list suitable for a <select>. */
export function flattenLocationsForSelect(locations: Location[]): LocationOption[] {
  const byParent = new Map<string, Location[]>();
  for (const loc of locations) {
    const key = loc.parentLocationId ?? '';
    byParent.set(key, [...(byParent.get(key) ?? []), loc]);
  }

  const options: LocationOption[] = [];
  const visit = (parentId: string, depth: number) => {
    const children = [...(byParent.get(parentId) ?? [])].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const child of children) {
      options.push({ id: child.id, label: `${'— '.repeat(depth)}${child.name}`, depth });
      visit(child.id, depth + 1);
    }
  };
  visit('', 0);
  return options;
}

export const locationApiClient = {
  getLocations: (): Promise<Location[]> => api.get<Location[]>('/locations').then((r) => r.data),

  getLocation: (id: string): Promise<Location> =>
    api.get<Location>(`/locations/${id}`).then((r) => r.data),

  createLocation: (data: CreateLocationInput): Promise<Location> =>
    api.post<Location>('/locations', data).then((r) => r.data),

  updateLocation: (id: string, data: UpdateLocationInput): Promise<Location> =>
    api.patch<Location>(`/locations/${id}`, data).then((r) => r.data),

  deleteLocation: (id: string): Promise<void> =>
    api.delete(`/locations/${id}`).then(() => undefined),
};
