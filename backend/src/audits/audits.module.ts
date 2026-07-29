import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditSession } from './entities/audit-session.entity';
import { AuditItem } from './entities/audit-item.entity';
import { Asset } from '../assets/entities/asset.entity';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AuditSession, AuditItem, Asset])],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule {}
