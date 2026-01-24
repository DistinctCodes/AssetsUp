import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentAccessPermission } from './entities/document-access-permission.entity';
import { DocumentAuditLog } from './entities/document-audit-log.entity';
import { DocumentService } from './services/document.service';
import { DocumentAuditService } from './services/document-audit.service';
import { DocumentController } from './controllers/document.controller';
import { DocumentAuditController } from './controllers/document-audit.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Document,
      DocumentVersion,
      DocumentAccessPermission,
      DocumentAuditLog,
    ]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 500 * 1024 * 1024, // 500MB
      },
    }),
  ],
  controllers: [DocumentController, DocumentAuditController],
  providers: [DocumentService, DocumentAuditService],
  exports: [DocumentService, DocumentAuditService],
})
export class DocumentsModule {}
