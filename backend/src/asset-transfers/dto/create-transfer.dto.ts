export enum TransferType {
  CHANGE_USER = 'change_user',
  CHANGE_DEPARTMENT = 'change_department',
  CHANGE_LOCATION = 'change_location',
  ALL = 'all'
}

export class CreateTransferDto {
  assetIds: string[];
  transferType: TransferType;
  sourceUserId?: string;
  destinationUserId?: string;
  sourceDepartmentId?: number;
  destinationDepartmentId?: number;
  sourceLocation?: string;
  destinationLocation?: string;
  reason: string;
  notes?: string;
  approvalRequired: boolean;
  scheduledDate?: string;
}