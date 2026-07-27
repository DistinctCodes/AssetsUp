import React from "react";
import { useAssetHistory } from "./useAssetHistory";
import { TimelineEvent } from "./AssetHistoryTypes";
export const AssetHistoryComponent: React.FC = () => {
  const { events } = useAssetHistory();
  return (
    <div className="border-l-2 border-blue-500 pl-4 ml-4">
      <h3 className="font-bold mb-4">Asset History</h3>
      {events.map((event: TimelineEvent) => (
        <div key={event.id} className="mb-2">
          <span className="text-gray-500 text-sm">{event.date}</span>
          <p>{event.description}</p>
        </div>
      ))}
    </div>
  );
};
