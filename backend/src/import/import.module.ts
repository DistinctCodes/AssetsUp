import { Module } from '@nestjs/common';
import { ImportService } from './import.service';

@Module({
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
