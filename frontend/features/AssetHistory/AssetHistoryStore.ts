import { createContext } from "react";
import { AssetHistoryState, TimelineEvent } from "./AssetHistoryTypes";
export interface AssetHistoryStore extends AssetHistoryState {
  addEvent: (event: TimelineEvent) => void;
}
export const AssetHistoryContext = createContext<AssetHistoryStore | undefined>(
  undefined,
);
