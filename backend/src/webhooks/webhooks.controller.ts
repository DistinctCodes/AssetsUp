import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
@UseGuards(AuthGuard('jwt'))
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(
    @Req() req: any,
    @Body()
    body: { name: string; url: string; events: string[]; secret?: string },
  ) {
    return this.webhooksService.create(
      req.user?.id,
      body.name,
      body.url,
      body.events,
      body.secret,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.webhooksService.findByUser(req.user?.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.webhooksService.remove(id, req.user?.id);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @Req() req: any) {
    return this.webhooksService.test(id, req.user?.id);
  }
}
