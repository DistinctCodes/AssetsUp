import { DepreciationScheduleEntryDto } from './depreciation-schedule-entry.dto';

export class AssetDepreciationResponseDto {
  assetId: string;
  assetTag: string;
  name: string;
  purchaseCost: number;
  purchaseDate: Date | null;
  depreciationMethod: string | null;
  usefulLifeMonths: number | null;
  salvageValue: number | null;
  currentBookValue: number;
  schedule: DepreciationScheduleEntryDto[];
}
