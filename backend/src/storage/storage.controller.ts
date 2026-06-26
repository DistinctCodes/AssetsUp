import { Controller, Post, Delete, Param, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const key = await this.storageService.upload(file);
    return { key, url: await this.storageService.getSignedUrl(key) };
  }

  @Delete(':key')
  async deleteFile(@Param('key') key: string) {
    await this.storageService.delete(key);
    return { message: 'File deleted' };
  }
}
