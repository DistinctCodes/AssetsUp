import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { UploadResponseDto } from './dto/upload-response.dto';

/**
 * File upload controller for handling asset images and documents
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Upload a single file
   * POST /api/upload/file
   */
  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    return this.uploadService.uploadFile(file);
  }

  /**
   * Upload multiple files
   * POST /api/upload/files
   */
  @Post('files')
  @UseInterceptors(FilesInterceptor('files', 5)) // max 5 files
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResponseDto[]> {
    return this.uploadService.uploadFiles(files);
  }

  /**
   * Download a file
   * GET /api/upload/:filename
   */
  @Get(':filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const file = await this.uploadService.getFile(filename);
      res.download(Buffer.from(file), filename);
    } catch (error) {
      throw new BadRequestException('File not found or invalid path');
    }
  }

  /**
   * Delete a file
   * DELETE /api/upload/:filename
   */
  @Delete(':filename')
  async deleteFile(@Param('filename') filename: string): Promise<void> {
    await this.uploadService.deleteFile(filename);
  }
}
