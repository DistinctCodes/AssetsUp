import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from './entities/asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  exports: [TypeOrmModule],
})
export class AssetsModule {}
