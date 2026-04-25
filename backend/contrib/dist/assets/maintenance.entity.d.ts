import { MaintenanceType, MaintenanceStatus } from './enums';
export declare class Maintenance {
    id: string;
    assetId: string;
    type: MaintenanceType;
    description: string | null;
    scheduledDate: Date | null;
    completedDate: Date | null;
    cost: number | null;
    performedBy: string | null;
    notes: string | null;
    status: MaintenanceStatus;
    createdAt: Date;
}
