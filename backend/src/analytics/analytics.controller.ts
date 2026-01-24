import { Controller, Get, Query, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto, DashboardStatsResponse, TrendsResponse, DistributionResponse } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { CustomThrottlerGuard } from '../security/throttler.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RbacGuard, CustomThrottlerGuard)
@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get main dashboard statistics' })
  @RequirePermission('analytics', 'read')
  async getDashboardStats(@Query() query: AnalyticsQueryDto, @Req() req: any): Promise<DashboardStatsResponse> {
    return this.analyticsService.getDashboardStats(query, req.user);
  }

  @Get('asset-stats')
  @ApiOperation({ summary: 'Get asset-specific statistics' })
  @RequirePermission('analytics', 'read')
  async getAssetStats() {
    return this.analyticsService.getAssetStats();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get trend data for charts' })
  @RequirePermission('analytics', 'read')
  async getTrends(@Query() query: AnalyticsQueryDto, @Req() req: any): Promise<TrendsResponse> {
    return this.analyticsService.getTrends(query, req.user);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get asset distribution data' })
  @RequirePermission('analytics', 'read')
  async getDistribution(@Query() query: AnalyticsQueryDto, @Req() req: any): Promise<DistributionResponse> {
    return this.analyticsService.getDistribution(query, req.user);
  }

  @Get('top-assets')
  @ApiOperation({ summary: 'Get most expensive/valuable assets' })
  @RequirePermission('analytics', 'read')
  async getTopAssets() {
    return this.analyticsService.getTopAssets();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get assets requiring attention' })
  @RequirePermission('analytics', 'read')
  async getAlerts() {
    return this.analyticsService.getAlerts();
  }

  @Get('departments/comparison')
  @ApiOperation({ summary: 'Compare departments' })
  @RequirePermission('analytics', 'read')
  async compareDepartments() {
    // Basic implementation using existing logic
    return this.analyticsService.getDistribution({}, { role: 'ADMIN' });
  }

  @Get('departments/:id')
  @ApiOperation({ summary: 'Get department-specific analytics' })
  @RequirePermission('analytics', 'read')
  async getDepartmentAnalytics(@Param('id') id: string) {
    return this.analyticsService.getDepartmentAnalytics(id);
  }

  @Get('locations/utilization')
  @ApiOperation({ summary: 'Get location utilization rates' })
  @RequirePermission('analytics', 'read')
  async getLocationUtilization() {
    return this.analyticsService.getDistribution({}, { role: 'ADMIN' });
  }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Get location-specific analytics' })
  @RequirePermission('analytics', 'read')
  async getLocationAnalytics(@Param('id') id: string) {
    return this.analyticsService.getLocationAnalytics(id);
  }

  @Get('users/activity')
  @ApiOperation({ summary: 'Get user activity statistics' })
  @RequirePermission('analytics', 'read')
  async getUserActivity() {
    // Placeholder
    return { activity: [] };
  }

  @Get('users/:id')
  @ApiOperation({ summary: "Get user's asset assignment history" })
  @RequirePermission('analytics', 'read')
  async getUserAnalytics(@Param('id') id: string) {
    return this.analyticsService.getUserAnalytics(id);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Asset registrations over time' })
  @RequirePermission('analytics', 'read')
  async getTimeline(@Query() query: AnalyticsQueryDto, @Req() req: any) {
    return this.analyticsService.getTrends(query, req.user);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Predictive analytics (asset needs)' })
  @RequirePermission('analytics', 'read')
  async getForecast() {
    // Mock forecast implementation
    return {
      forecast: [
        { month: '2025-02', predictedNeed: 15, confidence: 0.85 },
        { month: '2025-03', predictedNeed: 22, confidence: 0.78 },
      ]
    };
  }
}
