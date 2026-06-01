import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Location } from '../../locations/entities/location.entity';

// ─── Constants ────────────────────────────────────────────────────────────────

export const ASSET_TAG_PATTERN = /^[A-Z0-9_-]{2,30}$/;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum AssetStatus {
  ACTIVE      = 'active',
  INACTIVE    = 'inactive',
  MAINTENANCE = 'maintenance',
  RESERVED    = 'reserved',
  LOST        = 'lost',
  STOLEN      = 'stolen',
  DISPOSED    = 'disposed',
  RETIRED     = 'retired',
}

export enum AssetCondition {
  NEW       = 'new',
  EXCELLENT = 'excellent',
  GOOD      = 'good',
  FAIR      = 'fair',
  POOR      = 'poor',
  DAMAGED   = 'damaged',
}

export enum DepreciationMethod {
  STRAIGHT_LINE     = 'straight_line',
  DECLINING_BALANCE = 'declining_balance',
  NONE              = 'none',
}

export enum MaintenanceFrequency {
  WEEKLY    = 'weekly',
  MONTHLY   = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY  = 'annually',
  AS_NEEDED = 'as_needed',
}

// ─── Value-object interfaces ──────────────────────────────────────────────────

export interface WarrantyInfo {
  provider: string;
  referenceNumber?: string;
  startDate: string;
  expiryDate: string;
  coverageDetails?: string;
  contactInfo?: string;
}

export interface DepreciationConfig {
  method: DepreciationMethod;
  usefulLifeYears: number;
  residualValue: number;
  annualRate?: number;
}

export interface MaintenanceSchedule {
  frequency: MaintenanceFrequency;
  nextDueDate: string;
  lastCompletedDate?: string;
  estimatedDurationMinutes?: number;
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  expiryDate: string;
  insuredValue: number;
  currency: string;
}

export interface AssetCheckout {
  userId: string;
  checkedOutAt: string;
  expectedReturnAt?: string;
  returnedAt?: string;
  notes?: string;
}

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity('assets')
@Index('IDX_ASSET_STATUS_CATEGORY', ['status', 'category'])
@Index('IDX_ASSET_DEPT_STATUS',     ['departmentId', 'status'])
@Index('IDX_ASSET_LOCATION_STATUS', ['locationId', 'status'])
@Index('IDX_ASSET_ASSIGNED_USER',   ['assignedToUserId'])
@Index('IDX_ASSET_DELETED_AT',      ['deletedAt'])
@Check(`"name" <> ''`)
@Check(`"warrantyExpiryDate" IS NULL OR "purchaseDate" IS NULL OR "warrantyExpiryDate" >= "purchaseDate"`)
export class Asset {

  // ─── Identity ───────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index('IDX_ASSET_TAG', { unique: true, where: '"deletedAt" IS NULL AND "assetTag" IS NOT NULL' })
  @Column({ length: 30, nullable: true })
  assetTag?: string;

  @Index('IDX_ASSET_SERIAL', { unique: true, where: '"deletedAt" IS NULL AND "serialNumber" IS NOT NULL' })
  @Column({ length: 100, nullable: true })
  serialNumber?: string;

  @Column({ length: 100, nullable: true })
  manufacturer?: string;

  @Column({ length: 100, nullable: true })
  model?: string;

  @Column({ type: 'int', nullable: true })
  modelYear?: number;

  // ─── Classification ──────────────────────────────────────────────────────────

  @Index()
  @Column({ length: 100 })
  category: string;

  @Index()
  @Column({ length: 100, nullable: true })
  subCategory?: string;

  @Index()
  @Column({ type: 'enum', enum: AssetStatus, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ type: 'enum', enum: AssetCondition, default: AssetCondition.GOOD })
  condition: AssetCondition;

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  tags: string[];

  // ─── Financials ──────────────────────────────────────────────────────────────

  @Column({ length: 3, nullable: true, default: 'USD' })
  currency?: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate?: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchaseValue?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentValue?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  residualValue?: number;

  @Column({ type: 'int', nullable: true })
  usefulLifeYears?: number;

  @Column({
    type: 'enum',
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
    nullable: true,
  })
  depreciationMethod?: DepreciationMethod;

  @Column({ type: 'jsonb', nullable: true })
  depreciationConfig?: DepreciationConfig;

  @Column({ length: 200, nullable: true })
  vendor?: string;

  @Column({ length: 100, nullable: true })
  purchaseOrderNumber?: string;

  @Column({ length: 100, nullable: true })
  invoiceNumber?: string;

  // ─── Warranty ────────────────────────────────────────────────────────────────

  @Index('IDX_ASSET_WARRANTY_EXPIRY')
  @Column({ type: 'date', nullable: true })
  warrantyExpiryDate?: Date;

  @Column({ type: 'jsonb', nullable: true })
  warrantyInfo?: WarrantyInfo;

  // ─── Insurance ───────────────────────────────────────────────────────────────

  @Index('IDX_ASSET_INSURANCE_EXPIRY')
  @Column({ type: 'date', nullable: true })
  insuranceExpiryDate?: Date;

  @Column({ type: 'jsonb', nullable: true })
  insuranceInfo?: InsuranceInfo;

  // ─── Maintenance ─────────────────────────────────────────────────────────────

  @Index('IDX_ASSET_MAINTENANCE_DUE')
  @Column({ type: 'date', nullable: true })
  nextMaintenanceDue?: Date;

  @Column({ type: 'date', nullable: true })
  lastMaintenanceDate?: Date;

  @Column({ type: 'jsonb', nullable: true })
  maintenanceSchedule?: MaintenanceSchedule;

  // ─── Assignment ──────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  assignedToUserId?: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'assignedToUserId' })
  assignedToUser?: User;

  @Column({ type: 'timestamptz', nullable: true })
  assignedAt?: Date;

  @Column({ type: 'date', nullable: true })
  expectedReturnDate?: Date;

  // ─── Placement ───────────────────────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'departmentId' })
  department?: Department;

  @Column({ type: 'uuid', nullable: true })
  locationId?: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'locationId' })
  location?: Location;

  // ─── Media & documentation ───────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  photoUrl?: string;

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  additionalPhotoUrls: string[];

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  documentUrls: string[];

  // ─── Metadata ────────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ─── Audit ───────────────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  @Column({ type: 'uuid', nullable: true })
  deletedBy?: string;

  @Column({ type: 'text', nullable: true })
  statusChangeReason?: string;

  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt?: Date;

  // ─── Tokenization ──────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  stellarContractId?: string;

  @Column({ type: 'decimal', precision: 20, scale: 0, nullable: true })
  totalShares?: number;

  @Column({ default: false })
  isTokenized: boolean;

  @Column({ type: 'text', nullable: true })
  tokenizationTxHash?: string;

  @Column({ type: 'timestamptz', nullable: true })
  tokenizedAt?: Date;

  @Column({ length: 50, nullable: true })
  tokenSymbol?: string;

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get isAssigned(): boolean {
    return !!this.assignedToUserId;
  }

  get accruedDepreciation(): number | null {
    if (
      this.purchaseValue == null ||
      this.residualValue == null ||
      this.usefulLifeYears == null ||
      !this.purchaseDate
    ) {
      return null;
    }

    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const ageYears  = (Date.now() - new Date(this.purchaseDate).getTime()) / msPerYear;
    const annualDep = (this.purchaseValue - this.residualValue) / this.usefulLifeYears;
    const total     = Math.min(annualDep * ageYears, this.purchaseValue - this.residualValue);

    return Math.max(0, parseFloat(total.toFixed(2)));
  }

  // ─── Lifecycle hooks ─────────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields(): void {
    if (this.name)        this.name        = this.name.trim();
    if (this.description) this.description = this.description.trim();
    if (this.vendor)      this.vendor      = this.vendor.trim();

    if (this.assetTag) {
      this.assetTag = this.assetTag.toUpperCase().trim();
      if (!ASSET_TAG_PATTERN.test(this.assetTag)) {
        throw new Error(
          `Asset tag "${this.assetTag}" is invalid. Must match ${ASSET_TAG_PATTERN.source}`,
        );
      }
    }

    if (this.serialNumber) {
      this.serialNumber = this.serialNumber.trim();
    }

    if (this.tags) {
      this.tags = [...new Set(this.tags.map((t) => t.toLowerCase().trim()))];
    }

    if (this.warrantyInfo?.expiryDate) {
      this.warrantyExpiryDate = new Date(this.warrantyInfo.expiryDate);
    }

    if (this.insuranceInfo?.expiryDate) {
      this.insuranceExpiryDate = new Date(this.insuranceInfo.expiryDate);
    }

    if (this.maintenanceSchedule?.nextDueDate) {
      this.nextMaintenanceDue = new Date(this.maintenanceSchedule.nextDueDate);
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  validateFinancials(): void {
    if (
      this.purchaseValue != null &&
      this.residualValue != null &&
      Number(this.residualValue) > Number(this.purchaseValue)
    ) {
      throw new Error('residualValue cannot exceed purchaseValue');
    }

    if (
      this.currentValue != null &&
      this.purchaseValue != null &&
      Number(this.currentValue) > Number(this.purchaseValue)
    ) {
      throw new Error('currentValue cannot exceed purchaseValue');
    }
  }
}
