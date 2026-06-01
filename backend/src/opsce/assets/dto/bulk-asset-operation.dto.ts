import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BulkOperation {
  UPDATE_STATUS = 'update-status',
  REASSIGN = 'reassign',
  CHANGE_DEPARTMENT = 'change-department',
  CHANGE_LOCATION = 'change-location',
  SOFT_DELETE = 'soft-delete',
}

export class BulkAssetOperationDto {
  @ApiProperty({
    description: 'Array of asset UUIDs to operate on (max 100)',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('4', { each: true })
  ids: string[];

  @ApiProperty({
    description: 'Operation to apply to all specified assets',
    enum: BulkOperation,
    example: BulkOperation.UPDATE_STATUS,
  })
  @IsEnum(BulkOperation)
  operation: BulkOperation;

  @ApiPropertyOptional({
    description:
      'Operation-specific payload. ' +
      'update-status: { status: AssetStatus, reason?: string } | ' +
      'reassign: { assignedToUserId: string } | ' +
      'change-department: { departmentId: string } | ' +
      'change-location: { locationId: string } | ' +
      'soft-delete: {} (empty object)',
    example: { status: 'inactive' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export interface BulkOperationResult {
  succeeded: string[];
  failed: Array<{ id: string; reason: string }>;
}
