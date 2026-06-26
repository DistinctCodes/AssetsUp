import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckinRecord } from './checkin.entity';
import { Asset } from '../assets/entities/asset.entity';
import { CheckinService } from './checkin.service';
import { CheckinController } from './checkin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CheckinRecord, Asset])],
  controllers: [CheckinController],
  providers: [CheckinService],
  exports: [CheckinService],
})
export class CheckinModule {}
