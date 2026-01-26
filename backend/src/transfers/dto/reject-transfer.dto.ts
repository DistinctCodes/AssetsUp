import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RejectTransferDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  rejectionReason: string;
}
