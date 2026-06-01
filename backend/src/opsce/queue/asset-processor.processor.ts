import { Processor, WorkerHost, OnQueueEvent, QueueEvents } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AssetsService } from '../assets/assets.service';
import { StellarService } from '../stellar/stellar.service';

export interface GeneratePdfJobData {
  assetId: string;
  userId: string;
}

export interface StellarTokenizeJobData {
  assetId: string;
  symbol: string;
  totalShares: number;
  pricePerShare: number;
  metadata?: {
    name: string;
    description: string;
    assetType?: 'physical' | 'digital';
    ipfsUri?: string;
    legalDocsHash?: string;
    valuationReportHash?: string;
    accreditedInvestorRequired?: boolean;
    geographicRestrictions?: string[];
  };
}

@Processor('asset-queue')
@Injectable()
export class AssetProcessor extends WorkerHost {
  private readonly logger = new Logger(AssetProcessor.name);

  constructor(
    private readonly assetsService: AssetsService,
    private readonly stellarService: StellarService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    this.logger.log(`Processing job: ${job.name} with ID: ${job.id}`);

    switch (job.name) {
      case 'generate-pdf':
        return this.handleGeneratePdf(job.data as GeneratePdfJobData);
      case 'stellar-tokenize':
        return this.handleStellarTokenize(job.data as StellarTokenizeJobData);
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  }

  private async handleGeneratePdf(data: GeneratePdfJobData): Promise<any> {
    const { assetId, userId } = data;
    this.logger.log(`Generating PDF for asset ${assetId}`);

    const asset = await this.assetsService.findOne(assetId);
    const pdfBuffer = await this.generateAssetPdf(asset);

    return { assetId, pdfGenerated: true, timestamp: new Date().toISOString() };
  }

  private async handleStellarTokenize(data: StellarTokenizeJobData): Promise<any> {
    const { assetId, symbol, totalShares, pricePerShare, metadata } = data;
    this.logger.log(`Tokenizing asset ${assetId} on Stellar`);

    const result = await this.stellarService.tokenizeAsset(
      assetId,
      symbol,
      totalShares,
      pricePerShare,
      metadata,
    );

    if (result.success && result.transactionHash) {
      await this.assetsService.update(assetId, {
        isTokenized: true,
        stellarContractId: result.contractId,
        tokenizationTxHash: result.transactionHash,
        tokenizedAt: new Date(),
        totalShares: Number(result.totalShares),
        tokenSymbol: symbol,
      });
    }

    return result;
  }

  private async generateAssetPdf(asset: any): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();

    doc.fontSize(25).text(`Asset: ${asset.name}`, 100, 100);

    if (asset.description) {
      doc.fontSize(12).text(`Description: ${asset.description}`, 100, 150);
    }

    if (asset.serialNumber) {
      doc.text(`Serial Number: ${asset.serialNumber}`, 100, 200);
    }

    if (asset.category) {
      doc.text(`Category: ${asset.category}`, 100, 230);
    }

    if (asset.purchaseValue) {
      doc.text(`Purchase Value: $${asset.purchaseValue}`, 100, 260);
    }

    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      doc.end();
    });
  }

  @OnQueueEvent(QueueEvents.FAILED)
  async onJobFailed(event: { jobId: string; failedReason: string }) {
    this.logger.error(`Job ${event.jobId} failed: ${event.failedReason}`);
  }

  @OnQueueEvent(QueueEvents.COMPLETED)
  async onJobCompleted(event: { jobId: string; returnvalue: any }) {
    this.logger.log(`Job ${event.jobId} completed successfully`);
  }
}