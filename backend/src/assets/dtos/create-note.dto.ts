import { IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  content: string;
}
