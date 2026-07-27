export interface SkeletonConfig {
  rowCount: number;
  showAvatar?: boolean;
}
export interface LoadingState {
  isLoading: boolean;
  config: SkeletonConfig;
}
