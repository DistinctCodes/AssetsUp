import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

@Module({
  imports: [TypeOrmModule],
  controllers: [HealthController],
})
export class HealthModule {}
