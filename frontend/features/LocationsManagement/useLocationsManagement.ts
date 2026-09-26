import { useState } from "react";
import { Location } from "./LocationsManagementTypes";
export const useLocationsManagement = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const addLocation = (loc: Location) => setLocations((prev) => [...prev, loc]);
  const moveLocation = (locationId: string, targetId: string) => {
    setLocations((prev) => {
      const location = prev.find((item) => item.id === locationId);
      const target = prev.find((item) => item.id === targetId);
      if (!location || !target || locationId === targetId) return prev;

      const descendants = new Set<string>();
      let parentId = target.parentLocationId;
      while (parentId) {
        descendants.add(parentId);
        parentId = prev.find((item) => item.id === parentId)?.parentLocationId;
      }
      if (descendants.has(locationId)) return prev;

      const next = prev.map((item) =>
        item.id === locationId
          ? { ...item, parentLocationId: targetId, sortOrder: target.sortOrder ?? 0 }
          : item,
      );
      return next.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    });
  };
  const reorderLocation = (locationId: string, targetId: string) => {
    setLocations((prev) => {
      const from = prev.findIndex((item) => item.id === locationId);
      const to = prev.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((item, index) => ({ ...item, sortOrder: index }));
    });
  };
  return { locations, addLocation, moveLocation, reorderLocation };
};
