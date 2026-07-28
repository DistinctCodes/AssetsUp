import { createContext } from "react";
import { LoadingState } from "./LoadingSkeletonsTypes";
export interface LoadingStore extends LoadingState {
  setLoading: (val: boolean) => void;
}
export const LoadingSkeletonsContext = createContext<LoadingStore | undefined>(
  undefined,
);
