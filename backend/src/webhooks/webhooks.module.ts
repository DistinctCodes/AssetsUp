import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';

@Module({
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
