import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDocumentDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}
