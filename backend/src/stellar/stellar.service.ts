import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  Keypair,
  rpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  Address,
  nativeToScVal,
  Contract,
} from '@stellar/stellar-sdk';
import { Asset } from '../assets/asset.entity';
import { AssetStatus } from '../assets/enums';

@Injectable()
export class StellarService implements OnModuleInit {
  private readonly logger = new Logger(StellarService.name);
  private enabled = false;
  private keypair: Keypair;
  private server: rpc.Server;
  private contractId: string;
  private networkPassphrase: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.enabled = this.configService.get<string>('STELLAR_ENABLED') === 'true';
    if (!this.enabled) {
      this.logger.log('Stellar integration is disabled (STELLAR_ENABLED != true)');
      return;
    }

    const secretKey = this.configService.get<string>('STELLAR_SECRET_KEY');
    const rpcUrl = this.configService.get<string>('STELLAR_RPC_URL', 'https://soroban-testnet.stellar.org');
    this.contractId = this.configService.get<string>('STELLAR_CONTRACT_ID');
    this.networkPassphrase = this.configService.get<string>(
      'STELLAR_NETWORK_PASSPHRASE',
      Networks.TESTNET,
    );

    if (!secretKey || !this.contractId) {
      this.logger.error('STELLAR_SECRET_KEY and STELLAR_CONTRACT_ID must be set when STELLAR_ENABLED=true');
      this.enabled = false;
      return;
    }

    this.keypair = Keypair.fromSecret(secretKey);
    this.server = new rpc.Server(rpcUrl, { allowHttp: false });
    this.logger.log(`Stellar integration enabled. Public key: ${this.keypair.publicKey()}`);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Derives a deterministic 32-byte asset ID from the DB UUID using SHA-256.
   * Returns both the Buffer and its hex string.
   */
  deriveAssetId(uuid: string): { buffer: Buffer; hex: string } {
    const buffer = crypto.createHash('sha256').update(uuid).digest();
    return { buffer, hex: buffer.toString('hex') };
  }

  /**
   * Registers an asset on the Soroban contract.
   * Returns the confirmed transaction hash.
   */
  async registerAsset(asset: Asset): Promise<string> {
    const { buffer: assetIdBuffer } = this.deriveAssetId(asset.id);

    // Map backend AssetStatus → Soroban enum variant string
    const sorobanStatus = this.mapStatus(asset.status);

    // Build the asset ScVal (ScvMap, alphabetically sorted keys)
    const purchasePrice = asset.purchasePrice ? Math.round(Number(asset.purchasePrice) * 100) : 0;
    const now = BigInt(Math.floor(Date.now() / 1000));

    const assetScVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('category'),
        val: nativeToScVal(asset.category?.name ?? '', { type: 'string' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('custom_attributes'),
        val: xdr.ScVal.scvVec([]),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('description'),
        val: nativeToScVal(asset.description ?? '', { type: 'string' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('id'),
        val: xdr.ScVal.scvBytes(assetIdBuffer),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('last_transfer_timestamp'),
        val: nativeToScVal(0n, { type: 'u64' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('metadata_uri'),
        val: nativeToScVal('', { type: 'string' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('name'),
        val: nativeToScVal(asset.name, { type: 'string' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('owner'),
        val: new Address(this.keypair.publicKey()).toScVal(),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('purchase_value'),
        val: nativeToScVal(BigInt(purchasePrice), { type: 'i128' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('registration_timestamp'),
        val: nativeToScVal(now, { type: 'u64' }),
      }),
      new xdr.ScMapEntry({
        key: xdr.ScVal.scvSymbol('status'),
        val: xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(sorobanStatus)]),
      }),
    ]);

    // Fetch the source account
    const account = await this.server.getAccount(this.keypair.publicKey());

    // Build the transaction
    const contract = new Contract(this.contractId);
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call('register_asset', assetScVal))
      .setTimeout(300)
      .build();

    // Simulate to get the footprint
    const simResult = await this.server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(simResult)) {
      throw new Error(`Simulation failed: ${simResult.error}`);
    }

    // Assemble (applies footprint + auth entries)
    const assembled = rpc.assembleTransaction(tx, simResult).build();

    // Sign
    assembled.sign(this.keypair);

    // Submit
    const sendResult = await this.server.sendTransaction(assembled);
    if (sendResult.status === 'ERROR') {
      throw new Error(`Transaction submission failed: ${JSON.stringify(sendResult.errorResult)}`);
    }

    const txHash = sendResult.hash;
    this.logger.log(`Transaction submitted: ${txHash}, polling for confirmation...`);

    // Poll for finality (3s interval, 20 attempts ≈ 60s)
    return this.pollForConfirmation(txHash);
  }

  private async pollForConfirmation(txHash: string): Promise<string> {
    const MAX_ATTEMPTS = 20;
    const INTERVAL_MS = 3000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await this.sleep(INTERVAL_MS);
      const result = await this.server.getTransaction(txHash);

      if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
        this.logger.log(`Transaction confirmed: ${txHash}`);
        return txHash;
      }

      if (result.status === rpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed on-chain: ${txHash}`);
      }

      // MISSING or NOT_FOUND — still pending
      this.logger.debug(`Poll attempt ${attempt}/${MAX_ATTEMPTS}: status=${result.status}`);
    }

    throw new Error(`Transaction not confirmed after ${MAX_ATTEMPTS} attempts: ${txHash}`);
  }

  private mapStatus(status: AssetStatus): string {
    switch (status) {
      case AssetStatus.RETIRED:
        return 'Retired';
      default:
        return 'Active';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
