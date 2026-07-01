import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StellarService } from './stellar.service';

@Controller('stellar')
@UseGuards(AuthGuard('jwt'))
export class StellarKycController {
  constructor(private readonly stellarService: StellarService) {}

  @Post('assets/:id/lease')
  createLease(
    @Param('id') id: string,
    @Body() body: { lessee: string; terms: Record<string, unknown> },
  ) {
    return this.stellarService.createLease('', id, body.lessee, body.terms);
  }

  @Get('assets/:id/insurance')
  getInsurance(@Param('id') id: string) {
    return this.stellarService.getInsurancePolicy('', id);
  }

  @Post('kyc/submit')
  submitKyc(
    @Req() req: any,
    @Body() body: { documents: Record<string, string> },
  ) {
    return this.stellarService.submitKyc(req.user?.id, body.documents);
  }

  @Get('kyc/status')
  getKycStatus(@Req() req: any) {
    return this.stellarService.getKycStatus(req.user?.id);
  }
}
