export enum LocationType {
    BUILDING = 'building',
    FLOOR = 'floor',
    ROOM = 'room',
    DESK = 'desk',
    WAREHOUSE = 'warehouse',
    REMOTE = 'remote',
  }
  
  export interface Location {
    id: string;
    name: string;
    type: LocationType;
    address?: string;
    parentLocationId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface CreateLocationDto {
    name: string;
    type: LocationType;
    address?: string;
    parentLocationId?: string;
  }