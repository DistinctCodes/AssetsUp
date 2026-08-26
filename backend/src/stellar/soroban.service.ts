import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StellarConfig {
  network: 'testnet' | 'futurenet' | 'mainnet';
  rpcUrl: string;
  contractId: string;
  enabled: boolean;
}

export interface ContractResult {
  success: boolean;
  txHash?: string;
  ledger?: number;
  error?: string;
}

@Injectable()
export class SorobanService implements OnModuleInit {
  private readonly logger = new Logger(SorobanService.name);
  private config: StellarConfig;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    ) as StellarConfig['network'];
    const rpcUrl = this.configService.get<string>(
      'SOROBAN_RPC_URL',
      network === 'testnet'
        ? 'https://soroban-testnet.stellar.org'
        : network === 'futurenet'
          ? 'https://soroban-futurenet.stellar.org'
          : 'https://soroban-mainnet.stellar.org',
    );
    const contractId = this.configService.get<string>(
      'ASSETSUP_CONTRACT_ID',
      '',
    );
    const secretKey = this.configService.get<string>('STELLAR_SECRET_KEY');

    this.config = {
      network,
      rpcUrl,
      contractId,
      enabled: !!secretKey && !!contractId,
    };

    if (this.config.enabled) {
      this.logger.log(
        `SorobanService enabled — network: ${network}, contract: ${contractId}`,
      );
    } else {
      this.logger.warn(
        'SorobanService disabled — STELLAR_SECRET_KEY or ASSETSUP_CONTRACT_ID not set',
      );
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): StellarConfig {
    return { ...this.config };
  }

  async registerAsset(assetData: {
    name: string;
    assetTag: string;
    description?: string;
    category?: string;
  }): Promise<ContractResult> {
    if (!this.config.enabled) {
      this.logger.debug('registerAsset called in disabled mode — no-op');
      return { success: true };
    }

    try {
      this.logger.log(
        `Registering asset on-chain: ${assetData.assetTag} (${assetData.name})`,
      );

      // TODO: Implement actual Soroban contract invocation
      // const contract = new Contract(this.config.contractId);
      // const invocation = contract.call('register_asset', ...args);
      // const result = await server.simulateTransaction(invocation);
      // const tx = await server.sendTransaction(signedTx);
      // const ledger = await server.waitForTransaction(tx.hash);

      return {
        success: true,
        txHash: 'pending-implementation',
        ledger: 0,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`registerAsset failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async getAsset(assetId: string): Promise<ContractResult & { data?: any }> {
    if (!this.config.enabled) {
      return { success: true, data: null };
    }

    try {
      this.logger.log(`Reading asset from chain: ${assetId}`);

      // TODO: Implement actual Soroban contract read
      return { success: true, data: null };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`getAsset failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled) {
      return true;
    }

    try {
      // TODO: Implement RPC health check
      // const server = new SorobanRpc.Server(this.config.rpcUrl);
      // await server.getHealth();
      return true;
    } catch {
      return false;
    }
  }
}
