import { IsString, IsNotEmpty, IsInt, IsPositive } from 'class-validator';

export class CreateMovementDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsNotEmpty()
  initiatedBy: string;
}