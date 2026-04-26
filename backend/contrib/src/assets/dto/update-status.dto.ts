import { IsEnum, IsNotEmpty } from 'class-validator';
import { AssetStatus } from '../enums';

export class UpdateStatusDto {
  @IsNotEmpty()
  @IsEnum(AssetStatus)
  status: AssetStatus;
}
