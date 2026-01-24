import { IsOptional, IsDateString, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Department ID for filtering' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Location for filtering' })
  @IsOptional()
  @IsString()
  location?: string;
}

export interface DashboardStatsResponse {
  overview: {
    totalAssets: number;
    totalValue: number;
    changeFromLastMonth: {
      assets: number;
      value: number;
    };
  };
  assetsByStatus: Record<string, number>;
  assetsByCondition: Record<string, number>;
  topCategories: Array<{ name: string; count: number; value: number }>;
  topDepartments: Array<{ name: string; count: number; value: number }>;
  recentActivity: Array<{
    type: string;
    assetName: string;
    user: string;
    timestamp: string;
  }>;
  alerts: {
    warrantiesExpiring: number;
    maintenanceDue: number;
    highValueUnassigned: number;
    overdueTransfers: number;
  };
}

export interface TrendsResponse {
  assetRegistrations: Array<{ date: string; count: number }>;
  assetValue: Array<{ date: string; value: number }>;
  transferVolume: Array<{ date: string; count: number }>;
}

export interface DistributionResponse {
  byCategory: Array<{ category: string; percentage: number; count: number; value: number }>;
  byDepartment: Array<{ department: string; percentage: number; count: number }>;
  byLocation: Array<{ location: string; percentage: number; count: number }>;
  byStatus: Array<{ status: string; percentage: number; count: number }>;
}
