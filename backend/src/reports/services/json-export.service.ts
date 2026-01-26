import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonExportService {
  async generate(data: any[]): Promise<Buffer> {
    try {
      const json = JSON.stringify(data, null, 2);
      return Buffer.from(json, 'utf-8');
    } catch (error) {
      throw new Error(`JSON generation failed: ${error.message}`);
    }
  }
}
