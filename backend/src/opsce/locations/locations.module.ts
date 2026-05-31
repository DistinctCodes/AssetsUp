import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from './entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  exports: [TypeOrmModule],
})
export class LocationsModule {}
