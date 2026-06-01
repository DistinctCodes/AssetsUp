import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, Min, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TokenizeAssetDto {
  @ApiProperty({
    description: 'Token symbol for the asset (e.g., ASSET-001)',
    example: 'ASSET-001',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Total number of shares/tokens to create',
    example: 10000,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  totalShares: number;

  @ApiProperty({
    description: 'Price per share in the asset currency',
    example: 100.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  pricePerShare: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for tokenization',
  })
  @IsOptional()
  @IsObject()
  metadata?: TokenizationMetadataDto;
}

export class TokenizationMetadataDto {
  @ApiProperty({
    description: 'Name of the tokenized asset',
    example: 'Premium Real Estate Token',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Description of the tokenized asset',
    example: 'Fractional ownership of a commercial property',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Type of asset (physical or digital)',
    enum: ['physical', 'digital'],
    default: 'physical',
  })
  @IsOptional()
  @IsString()
  assetType?: 'physical' | 'digital';

  @ApiPropertyOptional({
    description: 'IPFS URI for extended metadata',
    example: 'ipfs://QmXxx...',
  })
  @IsOptional()
  @IsString()
  ipfsUri?: string;

  @ApiPropertyOptional({
    description: 'Hash of legal documentation (hex string)',
    example: '0x1234abcd...',
  })
  @IsOptional()
  @IsString()
  legalDocsHash?: string;

  @ApiPropertyOptional({
    description: 'Hash of valuation report (hex string)',
    example: '0x5678efgh...',
  })
  @IsOptional()
  @IsString()
  valuationReportHash?: string;

  @ApiPropertyOptional({
    description: 'Whether accredited investor status is required',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  accreditedInvestorRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Geographic restrictions (ISO country codes)',
    example: ['US', 'CA', 'UK'],
  })
  @IsOptional()
  @IsArray()
  geographicRestrictions?: string[];
}