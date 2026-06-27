import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../assets/asset.entity';
import { ReportingService } from './reporting.service';
import { ReportingController } from './reporting.controller';
import { ExportService } from './export.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asset]), forwardRef(() => QueueModule)],
  controllers: [ReportingController],
  providers: [ReportingService, ExportService],
  exports: [ReportingService, ExportService],
})
export class ReportingModule {}
