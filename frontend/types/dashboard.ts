export interface StatData {
    label: string;
    value: string | number;
    trend: number; // percentage
    trendDirection: 'up' | 'down' | 'neutral';
    icon: 'asset' | 'status' | 'value' | 'alert';
  }
  
  export interface Activity {
    id: string;
    assetId: string;
    assetName: string;
    actionType: 'created' | 'assigned' | 'transferred' | 'retired';
    user: string;
    timestamp: string;
  }

  export interface StatusBreakdown {
    active: number;
    assigned: number;
    maintenance: number;
    retired: number;
  }

  export interface AttentionBreakdown {
    warrantyExpiring: number;
    maintenanceDue: number;
  }

  export interface DashboardStatsResponse {
    cards: StatData[];
    statusBreakdown: StatusBreakdown;
    attentionBreakdown: AttentionBreakdown;
  }
  
  export interface ChartData {
    categoryData: { name: string; value: number; color: string }[];
    departmentData: { name: string; assets: number }[];
    registrationData: { date: string; count: number }[];
  }