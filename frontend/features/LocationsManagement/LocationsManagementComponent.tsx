import React from "react";
import { useLocationsManagement } from "./useLocationsManagement";
import { Location } from "./LocationsManagementTypes";
export const LocationsManagementComponent: React.FC = () => {
  const { locations } = useLocationsManagement();
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Locations Management</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc: Location) => (
          <div key={loc.id} className="border p-4 rounded shadow">
            <h2 className="font-semibold">{loc.name}</h2>
            <p className="text-gray-600">{loc.address}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
