import React from "react";
import { useLoadingSkeletons } from "./useLoadingSkeletons";
export const LoadingSkeletonsComponent: React.FC = () => {
  const { isLoading, config } = useLoadingSkeletons();
  if (!isLoading) return null;
  return (
    <div className="animate-pulse space-y-4">
      {Array.from({ length: config.rowCount }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
      ))}
    </div>
  );
};
