import { IsArray, IsString } from 'class-validator';

export class UpdateAssetTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
