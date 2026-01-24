import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentAuditLog, DocumentAuditActionType } from '../entities/document-audit-log.entity';

@Injectable()
export class DocumentAuditService {
  constructor(
    @InjectRepository(DocumentAuditLog)
    private readonly auditLogRepository: Repository<DocumentAuditLog>,
  ) {}

  async logAction(
    documentId: string,
    actionType: DocumentAuditActionType,
    userId: string | null,
    details?: string,
    metadata?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DocumentAuditLog> {
    const auditLog = this.auditLogRepository.create({
      documentId,
      actionType,
      userId,
      details,
      metadata: metadata || {},
      ipAddress,
      userAgent,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async getDocumentAuditLogs(documentId: string, limit = 100, offset = 0) {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { documentId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      relations: ['user'],
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  async getUserAuditLogs(userId: string, limit = 100, offset = 0) {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      relations: ['document'],
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  async getAuditLogsByActionType(
    actionType: DocumentAuditActionType,
    limit = 100,
    offset = 0,
  ) {
    const [logs, total] = await this.auditLogRepository.findAndCount({
      where: { actionType },
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
      relations: ['user', 'document'],
    });

    return {
      logs,
      total,
      limit,
      offset,
    };
  }
}
