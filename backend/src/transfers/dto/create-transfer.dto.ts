// src/transfers/dto/create-transfer.dto.ts
import {
  IsEnum,
  IsUUID,
  IsArray,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
  IsNotEmpty,
  ArrayMinSize,
  ValidateIf,
} from 'class-validator';
import { TransferType } from '../entities/transfer.entity';

export class CreateTransferDto {
  @IsEnum(TransferType)
  transferType: TransferType;

  @IsArray()
  @ArrayMinSize(1, { message: 'At least one asset must be selected' })
  @IsUUID('4', { each: true })
  assetIds: string[];

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.USER ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsOptional()
  fromUserId?: string;

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.USER ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsNotEmpty()
  toUserId?: string;

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.DEPARTMENT ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsOptional()
  fromDepartmentId?: string;

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.DEPARTMENT ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsNotEmpty()
  toDepartmentId?: string;

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.LOCATION ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsOptional()
  fromLocationId?: string;

  @ValidateIf(
    (o) =>
      o.transferType === TransferType.LOCATION ||
      o.transferType === TransferType.COMPLETE,
  )
  @IsUUID()
  @IsNotEmpty()
  toLocationId?: string;

  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Reason must not exceed 500 characters' })
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
