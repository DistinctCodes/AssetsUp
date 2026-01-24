/**
 * Document Management System - API Types and Schemas
 * This file provides TypeScript types for API responses and requests
 */

// Document Types
export enum DocumentType {
  INVOICE = 'invoice',
  WARRANTY = 'warranty',
  MANUAL = 'manual',
  PHOTO = 'photo',
  RECEIPT = 'receipt',
  CERTIFICATE = 'certificate',
  MAINTENANCE = 'maintenance',
  LICENSE = 'license',
  OTHER = 'other',
}

// Access Levels
export enum AccessLevel {
  PRIVATE = 'private',
  DEPARTMENT = 'department',
  ORGANIZATION = 'organization',
  PUBLIC = 'public',
}

// Permission Types
export enum PermissionType {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit',
  DELETE = 'delete',
  SHARE = 'share',
}

// Audit Action Types
export enum AuditActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  VERSION_CREATED = 'version_created',
  ACCESSED = 'accessed',
  DOWNLOADED = 'downloaded',
  DELETED = 'deleted',
  ARCHIVED = 'archived',
  UNARCHIVED = 'unarchived',
  PERMISSION_GRANTED = 'permission_granted',
  PERMISSION_UPDATED = 'permission_updated',
  PERMISSION_REVOKED = 'permission_revoked',
  VERSION_RESTORED = 'version_restored',
}

// Interfaces
export interface DocumentMetadata {
  [key: string]: any;
}

export interface FileMetadata {
  size: number;
  created: Date;
  modified: Date;
  exists: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Document Response Types
export interface IDocument {
  id: string;
  assetId: string;
  documentType: DocumentType;
  name: string;
  description?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  accessLevel: AccessLevel;
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
  metadata?: DocumentMetadata;
  checksum: string;
}

export interface IDocumentVersion {
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
  checksum: string;
  metadata?: DocumentMetadata;
}

export interface IDocumentAccessPermission {
  id: string;
  documentId: string;
  userId: string;
  permissions: PermissionType[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface IDocumentAuditLog {
  id: string;
  documentId: string;
  userId?: string;
  actionType: AuditActionType;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: DocumentMetadata;
  createdAt: Date;
}

// Request Types
export interface UploadDocumentRequest {
  file: Express.Multer.File;
  assetId: string;
  documentType: DocumentType;
  name: string;
  description?: string;
  accessLevel?: AccessLevel;
  expirationDate?: Date;
  tags?: string;
  metadata?: DocumentMetadata;
}

export interface UpdateDocumentRequest {
  file?: Express.Multer.File;
  name?: string;
  description?: string;
  accessLevel?: AccessLevel;
  expirationDate?: Date;
  tags?: string;
  changeLog?: string;
  metadata?: DocumentMetadata;
}

export interface GrantAccessRequest {
  userId: string;
  permissions: PermissionType[];
  expiresAt?: Date;
}

export interface UpdateAccessRequest {
  permissions: PermissionType[];
  expiresAt?: Date;
}

export interface SearchDocumentsRequest {
  query?: string;
  documentType?: DocumentType;
  accessLevel?: AccessLevel;
  assetId?: string;
  tags?: string;
  limit?: number;
  offset?: number;
}

export interface BulkActionRequest {
  documentIds: string[];
  action: 'archive' | 'unarchive' | 'delete' | 'changeAccessLevel';
  accessLevel?: AccessLevel;
}

// Response Types
export interface UploadDocumentResponse {
  success: boolean;
  document: IDocument;
}

export interface ListDocumentsResponse {
  documents: IDocument[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GetDocumentResponse {
  document: IDocument;
  versions: IDocumentVersion[];
  permissions: IDocumentAccessPermission[];
}

export interface DocumentVersionsResponse {
  versions: IDocumentVersion[];
  current: IDocumentVersion;
}

export interface PermissionsResponse {
  permissions: IDocumentAccessPermission[];
  total: number;
}

export interface AuditLogsResponse {
  logs: IDocumentAuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface BulkActionResponse {
  success: boolean;
  message: string;
  processed: number;
  failed: number;
}

export interface DownloadResponse {
  fileName: string;
  mimeType: string;
  fileSize: number;
  content: Buffer;
}

// Error Response Types
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: Date;
  path?: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
  validationErrors: {
    field: string;
    message: string;
  }[];
}

// Statistics and Analytics
export interface DocumentStatistics {
  totalDocuments: number;
  totalSize: number;
  byType: {
    type: DocumentType;
    count: number;
    totalSize: number;
  }[];
  byAccessLevel: {
    level: AccessLevel;
    count: number;
  }[];
  recentActivity: {
    date: Date;
    count: number;
  }[];
}

export interface UserStatistics {
  userId: string;
  documentsCreated: number;
  documentsModified: number;
  totalAccessGranted: number;
  recentActivity: IDocumentAuditLog[];
}

export interface AssetDocumentStatistics {
  assetId: string;
  totalDocuments: number;
  byType: {
    type: DocumentType;
    count: number;
  }[];
  lastModified: Date;
}

// API Configuration
export interface ApiConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  uploadDir: string;
  auditLogRetentionDays: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  enablePreview: boolean;
  enableOcr: boolean;
}

// Query Options
export interface DocumentQueryOptions {
  search?: string;
  skip?: number;
  take?: number;
  order?: 'ASC' | 'DESC';
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'fileSize';
  filters?: {
    documentType?: DocumentType;
    accessLevel?: AccessLevel;
    assetId?: string;
    createdAfter?: Date;
    createdBefore?: Date;
    tags?: string[];
  };
}

// Utility Types
export type DocumentId = string & { readonly __brand: 'DocumentId' };
export type AssetId = string & { readonly __brand: 'AssetId' };
export type UserId = string & { readonly __brand: 'UserId' };

// Helper functions to create branded types
export function createDocumentId(id: string): DocumentId {
  return id as DocumentId;
}

export function createAssetId(id: string): AssetId {
  return id as AssetId;
}

export function createUserId(id: string): UserId {
  return id as UserId;
}
