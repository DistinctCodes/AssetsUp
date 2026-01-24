import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { Asset } from '../assets/entities/asset.entity';
import { AssetCategory } from '../asset-categories/asset-category.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { RedisService } from '../common/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, AssetCategory, Department, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, RedisService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
