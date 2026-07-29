import { IsString } from 'class-validator';

export class AssignSeatDto {
  @IsString()
  userId: string;
}
