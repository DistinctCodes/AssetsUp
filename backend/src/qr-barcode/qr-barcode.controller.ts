import {
  Controller,
  Post,
  Param,
  Get,
  Query,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { GenerateCodeDto } from './dto/generate-qr-barcode.dto';
import { QrBarcodeService } from './qr-barcode.service';

@Controller('assets')
export class QrBarcodeController {
  constructor(private readonly codeService: QrBarcodeService) {}

  // POST /assets/:id/generate-code
  @Post(':id/generate-code')
  async generateCode(@Param('id') id: string, @Body() body: GenerateCodeDto) {
    const result = await this.codeService.generateAndStoreForAsset(id, {
      persist: body.persist,
      saveToDisk: body.saveToDisk,
      type: body.type,
    });
    return { success: true, data: result };
  }

  // GET /assets/:id/codes returns stored base64 strings
  @Get(':id/codes')
  async getCodes(@Param('id') id: string) {
    const data = await this.codeService.getCodesForAsset(id);
    return { success: true, data };
  }

  // GET /assets/:id/code/qr -> returns PNG directly
  @Get(':id/code/qr')
  async getQrImage(@Param('id') id: string, @Res() res: Response) {
    const { qr } = await this.codeService.getCodesForAsset(id);
    if (!qr)
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'QR not found' });
    // qr is a data URL -> convert to buffer
    const base64 = qr.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  // GET /assets/:id/code/barcode -> returns PNG directly
  @Get(':id/code/barcode')
  async getBarcodeImage(@Param('id') id: string, @Res() res: Response) {
    const { barcode } = await this.codeService.getCodesForAsset(id);
    if (!barcode)
      return res
        .status(HttpStatus.NOT_FOUND)
        .json({ success: false, message: 'Barcode not found' });
    const base64 = barcode.split(',')[1];
    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  }

  // GET /assets/verify?payload=<payload-string>
  @Get('verify')
  async verify(@Query('payload') payload: string) {
    const result = await this.codeService.verifyPayload(payload);
    return result;
  }
}
