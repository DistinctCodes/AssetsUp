import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * What an unauthenticated person scanning a printed QR label may see. Built by
 * explicit field mapping (never by spreading an entity), so adding a column to
 * `Asset` can't leak it here.
 */
export class PublicAssetDto {
  @ApiProperty() id: string;
  @ApiProperty({ description: 'The printed asset tag' }) assetId: string;
  @ApiProperty() name: string;
  @ApiProperty() status: string;
  @ApiPropertyOptional() category?: string;
  @ApiPropertyOptional() location?: string;
  @ApiPropertyOptional() imageUrl?: string;
}

export function toPublicAsset(asset: {
  id: string;
  assetTag: string;
  name: string;
  status: string;
  imageUrl?: string | null;
  category?: { name?: string } | null;
  location?: { name?: string } | null;
}): PublicAssetDto {
  return {
    id: asset.id,
    assetId: asset.assetTag,
    name: asset.name,
    status: asset.status,
    category: asset.category?.name ?? undefined,
    location: asset.location?.name ?? undefined,
    imageUrl: asset.imageUrl ?? undefined,
  };
}
