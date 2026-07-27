export interface TimelineEvent {
  id: string;
  date: string;
  description: string;
}
export interface AssetHistoryState {
  events: TimelineEvent[];
}
