import { createContext } from "react";
import { LocationsState, Location } from "./LocationsManagementTypes";
export interface LocationsStore extends LocationsState {
  addLocation: (loc: Location) => void;
}
export const LocationsManagementContext = createContext<
  LocationsStore | undefined
>(undefined);
