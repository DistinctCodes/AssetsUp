import { useState } from "react";
import { Location } from "./LocationsManagementTypes";
export const useLocationsManagement = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const addLocation = (loc: Location) => setLocations((prev) => [...prev, loc]);
  return { locations, addLocation };
};
