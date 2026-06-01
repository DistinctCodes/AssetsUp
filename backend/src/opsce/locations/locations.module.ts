import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';
import { Asset } from '../assets/entities/asset.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Location, Asset])],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [TypeOrmModule],
})
export class LocationsModule {}
