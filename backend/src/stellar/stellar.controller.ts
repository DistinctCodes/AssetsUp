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
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StellarService } from './stellar.service';

@Controller('stellar')
@UseGuards(AuthGuard('jwt'))
export class StellarController {
  constructor(
    private readonly stellarService: StellarService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  @Post('assets/register')
  async registerAsset(
    @Body() body: { assetId: string; metadata?: Record<string, string> },
  ) {
    return this.stellarService.registerAsset(body.assetId, body.metadata ?? {});
  }

  @Get('assets/:id')
  async getAsset(@Param('id') id: string) {
    const rows = await this.dataSource.query<{ id: string }[]>(
      'SELECT id, "assetId", name FROM assets WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  @Post('assets/:id/transfer')
  async transferAsset(
    @Param('id') id: string,
    @Body() body: { toAddress: string; amount: number },
  ) {
    return this.stellarService.transferAsset(id, body.toAddress, body.amount);
  }

  @Post('assets/:id/tokenize')
  async tokenizeAsset(
    @Param('id') id: string,
    @Body() body: { totalSupply: number; tokenName: string },
  ) {
    return this.stellarService.tokenizeAsset(
      id,
      body.totalSupply,
      body.tokenName,
    );
  }

  @Get('assets/:id/tokens')
  async getTokens(@Param('id') id: string, @Req() req: any) {
    const balance = await this.stellarService.getTokenBalance(
      id,
      String(req.user?.id),
    );
    return { assetId: id, balance };
  }

  @Post('assets/:id/tokens/transfer')
  async transferTokens(
    @Param('id') id: string,
    @Body() body: { toAddress: string; amount: number },
    @Req() req: any,
  ) {
    return this.stellarService.transferTokens(
      id,
      String(req.user?.id),
      body.toAddress,
      body.amount,
    );
  }

  @Post('assets/:id/tokens/lock')
  async lockTokens(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.stellarService.lockTokens(id, body.amount);
  }

  @Post('assets/:id/tokens/unlock')
  async unlockTokens(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.stellarService.unlockTokens(id, body.amount);
  }
}
