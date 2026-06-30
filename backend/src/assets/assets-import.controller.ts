import {
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { AssetsImportService } from './assets-import.service';

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsImportController {
  constructor(private readonly assetsImportService: AssetsImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async import(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.assetsImportService.import(file, req.user?.id);
  }
}