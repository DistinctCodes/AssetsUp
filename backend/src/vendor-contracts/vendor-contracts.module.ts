import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorContractsService } from './vendor-contracts.service';
import { VendorContractsController } from './vendor-contracts.controller';
import { ConsoleNotificationService } from '../notifications/console-notification.service';
import { VendorContract } from './entities/vendor-contract.entity';
import { VendorContractsScheduler } from './vendor-contract-scheduler';
import { NotificationService } from 'src/notifications/interfaces/notification.interface';

@Module({
  imports: [TypeOrmModule.forFeature([VendorContract])],
  controllers: [VendorContractsController],
  providers: [
    VendorContractsService,
    VendorContractsScheduler,
    // Provide a concrete notification implementation here:
    { provide: NotificationService, useClass: ConsoleNotificationService },
  ],
  exports: [VendorContractsService],
})
export class VendorContractsModule {}
