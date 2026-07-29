import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransferAssetDto {
  @ApiPropertyOptional({ description: 'Destination department id' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'departmentId must not be empty' })
  departmentId?: string;

  /**
   * A user id assigns the asset (flipping it to ASSIGNED); `null` clears the
   * assignment (reverting it to AVAILABLE).
   */
  @ApiPropertyOptional({
    description: 'Destination user id, or null to unassign',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'assignedToId must not be empty' })
  assignedToId?: string | null;

  @ApiPropertyOptional({ description: 'Transfer note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Alias accepted for the frontend's TransferAssetInput.notes field. */
  @ApiPropertyOptional({ description: 'Alias of note' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
