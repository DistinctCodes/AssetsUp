import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Document, DocumentType, DocumentAccessLevel } from '../entities/document.entity';
import { DocumentVersion } from '../entities/document-version.entity';
import { DocumentAccessPermission, DocumentPermissionType } from '../entities/document-access-permission.entity';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentSearchDto,
  GrantAccessDto,
  DocumentBulkActionDto,
  UpdateAccessPermissionsDto,
} from '../dto/document.dto';

@Injectable()
export class DocumentService {
  private readonly uploadDir = process.env.UPLOAD_DIR || './uploads/documents';

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly documentVersionRepository: Repository<DocumentVersion>,
    @InjectRepository(DocumentAccessPermission)
    private readonly accessPermissionRepository: Repository<DocumentAccessPermission>,
  ) {
    this.ensureUploadDirExists();
  }

  private ensureUploadDirExists() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private calculateFileChecksum(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private generateStoragePath(documentId: string, fileName: string): string {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return path.join(this.uploadDir, documentId, `${timestamp}-${sanitizedName}`);
  }

  async uploadDocument(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const documentId = crypto.randomUUID();
    const storagePath = this.generateStoragePath(documentId, file.originalname);

    try {
      // Ensure directory exists
      const dirPath = path.dirname(storagePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Save file
      fs.writeFileSync(storagePath, file.buffer);

      // Calculate checksum
      const checksum = this.calculateFileChecksum(storagePath);

      // Create document entity
      const document = this.documentRepository.create({
        id: documentId,
        ...createDocumentDto,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        filePath: storagePath,
        checksum,
        createdBy: userId,
        updatedBy: userId,
      });

      const savedDocument = await this.documentRepository.save(document);

      // Create initial version
      await this.documentVersionRepository.save({
        documentId: savedDocument.id,
        version: 1,
        fileName: file.originalname,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: userId,
        checksum,
      });

      return this.getDocument(savedDocument.id, userId);
    } catch (error) {
      // Cleanup on error
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
      throw new BadRequestException(`Failed to upload document: ${error.message}`);
    }
  }

  async updateDocument(
    documentId: string,
    updateDocumentDto: UpdateDocumentDto,
    file: Express.Multer.File | null,
    userId: string,
  ): Promise<Document> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check write permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.EDIT);

    // Update document properties
    Object.assign(document, updateDocumentDto);
    document.updatedBy = userId;

    // Handle file update if provided
    if (file) {
      const storagePath = this.generateStoragePath(documentId, file.originalname);

      try {
        // Ensure directory exists
        const dirPath = path.dirname(storagePath);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Save new file
        fs.writeFileSync(storagePath, file.buffer);

        // Calculate checksum
        const checksum = this.calculateFileChecksum(storagePath);

        // Update document
        document.fileName = file.originalname;
        document.mimeType = file.mimetype;
        document.fileSize = file.size;
        document.filePath = storagePath;
        document.checksum = checksum;
        document.currentVersion += 1;

        // Create new version
        await this.documentVersionRepository.save({
          documentId: document.id,
          version: document.currentVersion,
          fileName: file.originalname,
          filePath: storagePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: userId,
          checksum,
          changeLog: updateDocumentDto.changeLog || `Version ${document.currentVersion}`,
        });
      } catch (error) {
        // Cleanup on error
        if (fs.existsSync(storagePath)) {
          fs.unlinkSync(storagePath);
        }
        throw new BadRequestException(`Failed to update document: ${error.message}`);
      }
    }

    return this.documentRepository.save(document);
  }

  async getDocument(documentId: string, userId: string) {
    const document = await this.findDocumentOrThrow(documentId);

    // Check read permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.VIEW);

    // Load relations
    return this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['versions', 'createdByUser', 'updatedByUser'],
    });
  }

  async listDocuments(searchDto: DocumentSearchDto, userId: string) {
    const { query, documentType, accessLevel, assetId, tags, limit = 20, offset = 0 } = searchDto;

    let queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.versions', 'versions')
      .leftJoinAndSelect('document.createdByUser', 'createdByUser')
      .leftJoinAndSelect('document.updatedByUser', 'updatedByUser');

    // Filter by user's permissions or access level
    queryBuilder = queryBuilder.where(
      '(document.createdBy = :userId OR document.accessLevel = :publicLevel OR document.accessLevel = :orgLevel)',
      {
        userId,
        publicLevel: DocumentAccessLevel.PUBLIC,
        orgLevel: DocumentAccessLevel.ORGANIZATION,
      },
    );

    if (query) {
      queryBuilder = queryBuilder.andWhere(
        "(document.name ILIKE :query OR document.description ILIKE :query)",
        { query: `%${query}%` },
      );
    }

    if (documentType) {
      queryBuilder = queryBuilder.andWhere('document.documentType = :documentType', { documentType });
    }

    if (accessLevel) {
      queryBuilder = queryBuilder.andWhere('document.accessLevel = :accessLevel', { accessLevel });
    }

    if (assetId) {
      queryBuilder = queryBuilder.andWhere('document.assetId = :assetId', { assetId });
    }

    if (tags) {
      queryBuilder = queryBuilder.andWhere('document.tags ILIKE :tags', { tags: `%${tags}%` });
    }

    queryBuilder = queryBuilder
      .andWhere('document.isActive = true')
      .andWhere('document.isArchived = false')
      .orderBy('document.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const [documents, total] = await queryBuilder.getManyAndCount();

    return {
      documents,
      total,
      limit,
      offset,
    };
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check delete permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.DELETE);

    // Delete physical files
    const versions = await this.documentVersionRepository.find({ where: { documentId } });
    const filePaths = new Set(versions.map((v) => v.filePath));

    filePaths.forEach((filePath) => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
      }
    });

    // Delete database records
    await this.documentVersionRepository.delete({ documentId });
    await this.accessPermissionRepository.delete({ documentId });
    await this.documentRepository.remove(document);
  }

  async archiveDocument(documentId: string, userId: string): Promise<Document> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check edit permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.EDIT);

    document.isArchived = true;
    document.archivedAt = new Date();
    document.updatedBy = userId;

    return this.documentRepository.save(document);
  }

  async unarchiveDocument(documentId: string, userId: string): Promise<Document> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check edit permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.EDIT);

    document.isArchived = false;
    document.archivedAt = null;
    document.updatedBy = userId;

    return this.documentRepository.save(document);
  }

  async getDocumentVersion(documentId: string, version: number, userId: string): Promise<DocumentVersion> {
    // Check read permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.VIEW);

    const documentVersion = await this.documentVersionRepository.findOne({
      where: { documentId, version },
    });

    if (!documentVersion) {
      throw new NotFoundException(`Document version ${version} not found`);
    }

    return documentVersion;
  }

  async getAllVersions(documentId: string, userId: string): Promise<DocumentVersion[]> {
    await this.findDocumentOrThrow(documentId);

    // Check read permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.VIEW);

    return this.documentVersionRepository.find({
      where: { documentId },
      order: { version: 'DESC' },
    });
  }

  async restoreVersion(documentId: string, version: number, userId: string): Promise<Document> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check edit permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.EDIT);

    const targetVersion = await this.documentVersionRepository.findOne({
      where: { documentId, version },
    });

    if (!targetVersion) {
      throw new NotFoundException(`Document version ${version} not found`);
    }

    // Create new version from old
    const newVersion = document.currentVersion + 1;

    const newVersionRecord = this.documentVersionRepository.create({
      documentId: document.id,
      version: newVersion,
      fileName: targetVersion.fileName,
      filePath: targetVersion.filePath,
      fileSize: targetVersion.fileSize,
      mimeType: targetVersion.mimeType,
      uploadedBy: userId,
      checksum: targetVersion.checksum,
      changeLog: `Restored from version ${version}`,
    });

    await this.documentVersionRepository.save(newVersionRecord);

    document.currentVersion = newVersion;
    document.fileName = targetVersion.fileName;
    document.mimeType = targetVersion.mimeType;
    document.fileSize = targetVersion.fileSize;
    document.filePath = targetVersion.filePath;
    document.checksum = targetVersion.checksum;
    document.updatedBy = userId;

    return this.documentRepository.save(document);
  }

  async grantAccess(documentId: string, grantDto: GrantAccessDto, userId: string): Promise<DocumentAccessPermission> {
    const document = await this.findDocumentOrThrow(documentId);

    // Check share permission
    await this.checkPermission(documentId, userId, DocumentPermissionType.SHARE);

    // Check if permission already exists
    let permission = await this.accessPermissionRepository.findOne({
      where: { documentId, userId: grantDto.userId },
    });

    if (permission) {
      permission.permissions = grantDto.permissions as DocumentPermissionType[];
      permission.expiresAt = grantDto.expiresAt ? new Date(grantDto.expiresAt) : null;
      permission.isActive = true;
    } else {
      permission = this.accessPermissionRepository.create({
        documentId,
        userId: grantDto.userId,
        permissions: grantDto.permissions as DocumentPermissionType[],
        expiresAt: grantDto.expiresAt ? new Date(grantDto.expiresAt) : null,
        grantedBy: userId,
      });
    }

    return this.accessPermissionRepository.save(permission);
  }

  async updateAccessPermissions(
    documentId: string,
    userId: string,
    updateDto: UpdateAccessPermissionsDto,
    requestingUserId: string,
  ): Promise<DocumentAccessPermission> {
    // Check share permission
    await this.checkPermission(documentId, requestingUserId, DocumentPermissionType.SHARE);

    const permission = await this.accessPermissionRepository.findOne({
      where: { documentId, userId },
    });

    if (!permission) {
      throw new NotFoundException('Access permission not found');
    }

    permission.permissions = updateDto.permissions as DocumentPermissionType[];
    permission.expiresAt = updateDto.expiresAt ? new Date(updateDto.expiresAt) : null;

    return this.accessPermissionRepository.save(permission);
  }

  async revokeAccess(documentId: string, userId: string, requestingUserId: string): Promise<void> {
    // Check share permission
    await this.checkPermission(documentId, requestingUserId, DocumentPermissionType.SHARE);

    await this.accessPermissionRepository.delete({ documentId, userId });
  }

  async getDocumentPermissions(documentId: string, userId: string): Promise<DocumentAccessPermission[]> {
    const document = await this.findDocumentOrThrow(documentId);

    // Only document owner or admins can see all permissions
    if (document.createdBy !== userId) {
      throw new ForbiddenException('Only document owner can view all permissions');
    }

    return this.accessPermissionRepository.find({
      where: { documentId, isActive: true },
    });
  }

  async checkPermission(documentId: string, userId: string, permissionType: DocumentPermissionType): Promise<boolean> {
    const document = await this.findDocumentOrThrow(documentId);

    // Document owner has all permissions
    if (document.createdBy === userId) {
      return true;
    }

    // Check access level first
    if (document.accessLevel === DocumentAccessLevel.PUBLIC) {
      if (permissionType === DocumentPermissionType.VIEW || permissionType === DocumentPermissionType.DOWNLOAD) {
        return true;
      }
    }

    // Check explicit permissions
    const permission = await this.accessPermissionRepository.findOne({
      where: { documentId, userId, isActive: true },
    });

    if (permission) {
      // Check if permission has expired
      if (permission.expiresAt && new Date() > permission.expiresAt) {
        throw new UnauthorizedException('Access permission has expired');
      }

      if (permission.permissions.includes(permissionType)) {
        return true;
      }
    }

    throw new ForbiddenException(`You don't have permission to ${permissionType} this document`);
  }

  async bulkAction(bulkActionDto: DocumentBulkActionDto, userId: string): Promise<void> {
    const documents = await this.documentRepository.find({
      where: { id: In(bulkActionDto.documentIds) },
    });

    for (const document of documents) {
      try {
        switch (bulkActionDto.action) {
          case 'archive':
            await this.archiveDocument(document.id, userId);
            break;
          case 'unarchive':
            await this.unarchiveDocument(document.id, userId);
            break;
          case 'delete':
            await this.deleteDocument(document.id, userId);
            break;
          case 'changeAccessLevel':
            if (!bulkActionDto.accessLevel) {
              throw new BadRequestException('accessLevel is required for changeAccessLevel action');
            }
            await this.checkPermission(document.id, userId, DocumentPermissionType.EDIT);
            document.accessLevel = bulkActionDto.accessLevel;
            document.updatedBy = userId;
            await this.documentRepository.save(document);
            break;
          default:
            throw new BadRequestException(`Unknown action: ${bulkActionDto.action}`);
        }
      } catch (error) {
        console.error(`Failed to perform action on document ${document.id}:`, error);
      }
    }
  }

  async getDocumentsByAsset(assetId: string, userId: string): Promise<Document[]> {
    return this.documentRepository.find({
      where: { assetId, isActive: true, isArchived: false },
      relations: ['versions', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  private async findDocumentOrThrow(documentId: string): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with id ${documentId} not found`);
    }

    return document;
  }
}
