import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Laptop' })
  @ApiDescription('The name of the category')
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Portable computing devices' })
  @ApiDescription('A brief description of the category')
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;
}
