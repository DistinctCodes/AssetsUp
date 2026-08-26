export class DepreciationReportDto {
  totalBookValue: number;
  totalOriginalCost: number;
  totalAccumulatedDepreciation: number;
  monthlyDepreciationExpense: number;
  assetCount: number;
  byCategory: Array<{
    categoryId: string | null;
    categoryName: string | null;
    bookValue: number;
    assetCount: number;
  }>;
}
