import { IsUUID, IsEnum, IsString, IsOptional, IsDateString, IsNumber, IsObject } from 'class-validator';
import { DocumentType, DocumentAccessLevel } from '../entities/document.entity';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDocumentDto {
  @IsUUID()
  assetId: string;

  @IsEnum(DocumentType)
  documentType: DocumentType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(DocumentAccessLevel)
  @IsOptional()
  accessLevel?: DocumentAccessLevel;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsString()
  changeLog?: string;
}

export class DocumentResponseDto {
  id: string;
  assetId: string;
  documentType: DocumentType;
  name: string;
  description?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  accessLevel: DocumentAccessLevel;
  isActive: boolean;
  currentVersion: number;
  tags?: string;
  expirationDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt: Date;
  isArchived: boolean;
  archivedAt?: Date;
  metadata?: Record<string, any>;
}

export class DocumentDetailResponseDto extends DocumentResponseDto {
  versions: DocumentVersionResponseDto[];
  permissions: DocumentAccessPermissionResponseDto[];
}

export class DocumentVersionResponseDto {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  changeLog?: string;
  uploadedBy: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

export class DocumentAccessPermissionResponseDto {
  id: string;
  documentId: string;
  userId: string;
  permissions: string[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class GrantAccessDto {
  @IsUUID()
  userId: string;

  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class RevokeAccessDto {
  @IsUUID()
  userId: string;
}

export class UpdateAccessPermissionsDto {
  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class DocumentSearchDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;
}

export class DocumentBulkActionDto {
  @IsUUID('4', { each: true })
  documentIds: string[];

  @IsString()
  action: 'archive' | 'unarchive' | 'delete' | 'changeAccessLevel';

  @IsOptional()
  @IsEnum(DocumentAccessLevel)
  accessLevel?: DocumentAccessLevel;
}
