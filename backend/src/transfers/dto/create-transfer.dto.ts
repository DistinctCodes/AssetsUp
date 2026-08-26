import { IsString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  assetId: string;

  @IsString()
  fromDepartmentId: string;

  @IsString()
  toDepartmentId: string;

  @IsString()
  requestedByUserId: string;
}