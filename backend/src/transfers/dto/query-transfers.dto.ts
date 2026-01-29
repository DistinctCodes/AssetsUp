import { IsOptional, IsEnum, IsUUID, IsDateString } from 'class-validator';
import { TransferStatus, TransferType } from '../entities/transfer.entity';

export class QueryTransfersDto {
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;

  @IsOptional()
  @IsEnum(TransferType)
  transferType?: TransferType;

  @IsOptional()
  @IsUUID()
  requestedBy?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 20;
}
