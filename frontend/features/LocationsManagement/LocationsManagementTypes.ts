export interface Location {
  id: string;
  name: string;
  address: string;
  parentLocationId?: string;
  sortOrder?: number;
}
export interface LocationsState {
  locations: Location[];
}
