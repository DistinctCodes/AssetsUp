import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CheckinService } from './checkin.service';
import { CheckoutDto } from './dtos/checkout.dto';
import { CheckinDto } from './dtos/checkin.dto';

@Controller('checkin')
@UseGuards(AuthGuard('jwt'))
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Post('checkout')
  async checkout(@Body() dto: CheckoutDto, @Req() req: any) {
    return this.checkinService.checkout(dto, req.user?.id);
  }

  @Post('checkin')
  async checkin(@Body() dto: CheckinDto, @Req() req: any) {
    return this.checkinService.checkin(dto, req.user?.id);
  }

  @Get('active')
  async getActiveCheckouts() {
    return this.checkinService.getActiveCheckouts();
  }

  @Get('asset/:assetId')
  async getAssetHistory(@Param('assetId') assetId: string) {
    return this.checkinService.getAssetHistory(assetId);
  }
}
