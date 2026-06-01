import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [AssetsService],
  controllers: [AssetsController],
  exports: [TypeOrmModule, AssetsService],
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Asset]), AuditModule],
  controllers: [AssetsController],
  providers: [AssetsService],
  exports: [TypeOrmModule, AssetsService],
  exports: [AssetsService],
})
export class AssetsModule {}
