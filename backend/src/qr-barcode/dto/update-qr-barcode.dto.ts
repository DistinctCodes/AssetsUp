import { PartialType } from '@nestjs/swagger';
import { CreateQrBarcodeDto } from './generate-qr-barcode.dto';

export class UpdateQrBarcodeDto extends PartialType(CreateQrBarcodeDto) {}
