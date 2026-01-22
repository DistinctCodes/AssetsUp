export class ApproveTransferDto {
  approvedById: string;
  notes?: string;
}

export class RejectTransferDto {
  rejectedById: string;
  rejectionReason: string;
}