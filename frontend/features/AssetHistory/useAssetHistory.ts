import { useState } from "react";
import { TimelineEvent } from "./AssetHistoryTypes";
export const useAssetHistory = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([
    { id: "1", date: "2023-01-01", description: "Asset Created" },
  ]);
  const addEvent = (event: TimelineEvent) =>
    setEvents((prev) => [...prev, event]);
  return { events, addEvent };
};
