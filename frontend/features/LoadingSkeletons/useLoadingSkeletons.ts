import { useState } from "react";
import { SkeletonConfig } from "./LoadingSkeletonsTypes";
export const useLoadingSkeletons = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [config, setConfig] = useState<SkeletonConfig>({ rowCount: 3 });
  return { isLoading, config, setLoading: setIsLoading, setConfig };
};
