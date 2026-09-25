import React from "react";
import { DndContext, DragEndEvent, closestCenter, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useLocationsManagement } from "./useLocationsManagement";
import { Location } from "./LocationsManagementTypes";
export const LocationsManagementComponent: React.FC = () => {
  const { locations, moveLocation, reorderLocation } = useLocationsManagement();
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const activeLocation = locations.find((loc) => loc.id === active.id);
    const targetLocation = locations.find((loc) => loc.id === over.id);
    if (!activeLocation || !targetLocation) return;
    if (activeLocation.parentLocationId === targetLocation.parentLocationId) {
      reorderLocation(String(active.id), String(over.id));
    } else {
      moveLocation(String(active.id), String(over.id));
    }
  };
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <div className="p-4">
      <h1 className="text-2xl font-bold">Locations Management</h1>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc: Location) => (
          <DraggableLocation key={loc.id} location={loc} />
        ))}
      </div>
    </div>
    </DndContext>
  );
};

function DraggableLocation({ location }: { location: Location }) {
  const { attributes, listeners, setNodeRef: setDragRef, transform } = useDraggable({ id: location.id });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: location.id });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div ref={(node) => { setDragRef(node); setDropRef(node); }} style={style} {...listeners} {...attributes}
      className={`border p-4 rounded shadow cursor-grab active:cursor-grabbing ${isOver ? "ring-2 ring-blue-500" : ""}`}>
      <h2 className="font-semibold">{location.name}</h2>
      <p className="text-gray-600">{location.address}</p>
    </div>
  );
}
