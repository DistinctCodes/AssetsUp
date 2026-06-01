import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AssetProcessor } from './asset-processor.processor';
import { QueueProducerService } from './queue-producer.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'asset-queue',
    }),
  ],
  providers: [AssetProcessor, QueueProducerService],
  exports: [QueueProducerService],
})
export class QueueModule {}