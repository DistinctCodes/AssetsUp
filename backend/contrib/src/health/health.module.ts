import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [TerminusModule, TypeOrmModule.forFeature([])],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}