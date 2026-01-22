export enum TransferStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXECUTED = 'executed',
  SCHEDULED = 'scheduled'
}

export class TransferFilterDto {
  status?: TransferStatus;
  createdBy?: string;
  departmentId?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}