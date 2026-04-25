import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { documentMulterOptions, imageMulterOptions, UploadService } from './upload.service';

interface UploadedFileShape {
  filename: string;
  mimetype: string;
  size: number;
}

const uploadRoot =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.UPLOAD_DEST ||
  'uploads';

@ApiTags('Upload')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', imageMulterOptions(uploadRoot)),
  )
  async uploadImage(@UploadedFile() file: UploadedFileShape): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    if (!isAllowed || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Invalid image type or size exceeds 5MB');
    }

    return { url: this.uploadService.imageUrl(file.filename) };
  }

  @Post('document')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', documentMulterOptions(uploadRoot)),
  )
  async uploadDocument(@UploadedFile() file: UploadedFileShape): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Document file is required');
    }

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (!allowed.includes(file.mimetype) || file.size > 20 * 1024 * 1024) {
      throw new BadRequestException('Invalid document type or size exceeds 20MB');
    }

    return { url: this.uploadService.documentUrl(file.filename) };
  }
}
