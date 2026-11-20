import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { TransferStatus } from '../entities/asset-transfer.entity';

export class ListTransfersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Only transfers requested by this user id; `me` means the caller',
  })
  @IsOptional()
  @IsString()
  requestedByUserId?: string;

  @ApiPropertyOptional({ enum: TransferStatus })
  @IsOptional()
  @IsEnum(TransferStatus)
  status?: TransferStatus;
}
