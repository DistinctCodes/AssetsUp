import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AuditItemResult } from '../entities/audit-item.entity';

export class RecordAuditItemDto {
  @IsEnum(AuditItemResult)
  result: AuditItemResult;

  @IsOptional()
  @IsString()
  note?: string;
}
