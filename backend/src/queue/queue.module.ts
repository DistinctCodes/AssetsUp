import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { ExportProcessor } from './processors/export.processor';
import { ReportingModule } from '../reporting/reporting.module';
import { MailModule } from '../mail/mail.module';
import { ActivityLogModule } from '../activity-log/activity-log.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get<string>('REDIS_PORT', '6379'), 10),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'email' }, { name: 'export' }),
    forwardRef(() => ReportingModule),
    MailModule,
    ActivityLogModule,
  ],
  providers: [QueueService, EmailProcessor, ExportProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
