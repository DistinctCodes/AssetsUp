import { Injectable } from '@nestjs/common';
import { Parser } from 'json2csv';

@Injectable()
export class CsvExportService {
  async generate(data: any[], fields?: string[]): Promise<Buffer> {
    try {
      const parser = new Parser({ fields });
      const csv = parser.parse(data);
      return Buffer.from(csv, 'utf-8');
    } catch (error) {
      throw new Error(`CSV generation failed: ${error.message}`);
    }
  }
}

// src/reports/services/json-export.service.ts
