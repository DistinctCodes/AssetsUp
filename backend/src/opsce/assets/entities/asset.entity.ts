import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Check,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User }       from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Location }   from '../../locations/entities/location.entity';

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
  STRAIGHT_LINE      = 'straight_line',
  DECLINING_BALANCE  = 'declining_balance',
  NONE               = 'none',
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
  /** Warranty provider / vendor name */
  provider: string;
  /** Warranty reference or contract number */
  referenceNumber?: string;
  /** ISO 8601 date — when warranty begins */
  startDate: string;
  /** ISO 8601 date — when warranty expires */
  expiryDate: string;
  /** Coverage description (e.g. "Parts and labour") */
  coverageDetails?: string;
  /** Support contact (email or phone) */
  contactInfo?: string;
}

export interface DepreciationConfig {
  method: DepreciationMethod;
  /** Useful life in years */
  usefulLifeYears: number;
  /** Residual / salvage value at end of life */
  residualValue: number;
  /** Annual depreciation rate as a decimal (e.g. 0.2 = 20%) — for declining-balance */
  annualRate?: number;
}

export interface MaintenanceSchedule {
  frequency: MaintenanceFrequency;
  /** ISO 8601 date of the next scheduled maintenance */
  nextDueDate: string;
  /** ISO 8601 date of the last completed maintenance */
  lastCompletedDate?: string;
  /** Estimated duration in minutes */
  estimatedDurationMinutes?: number;
  notes?: string;
}

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  /** ISO 8601 date */
  expiryDate: string;
  /** Insured value */
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
@Index('IDX_ASSET_STATUS_CATEGORY',    ['status', 'category'])
@Index('IDX_ASSET_DEPT_STATUS',        ['departmentId', 'status'])
@Index('IDX_ASSET_LOCATION_STATUS',    ['locationId', 'status'])
@Index('IDX_ASSET_ASSIGNED_USER',      ['assignedToUserId'])
@Index('IDX_ASSET_DELETED_AT',         ['deletedAt'])
@Check(`"name" <> ''`)
@Check(`"purchaseValue"  IS NULL OR "purchaseValue"  >= 0`)
@Check(`"currentValue"   IS NULL OR "currentValue"   >= 0`)
@Check(`"residualValue"  IS NULL OR "residualValue"  >= 0`)
@Check(`"usefulLifeYears" IS NULL OR "usefulLifeYears" > 0`)
@Check(
  `"warrantyExpiryDate" IS NULL OR "purchaseDate" IS NULL OR "warrantyExpiryDate" >= "purchaseDate"`,
)
export class Asset {

  // ─── Identity ───────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  /**
   * Asset tag / barcode printed on the physical label.
   * Must match ASSET_TAG_PATTERN when set.
   */
  @Index('IDX_ASSET_TAG', { unique: true, where: '"deletedAt" IS NULL AND "assetTag" IS NOT NULL' })
  @Column({ length: 30, nullable: true })
  assetTag?: string;

  /**
   * Manufacturer serial number.
   * Partial unique index — allows duplicate nulls for assets without serials.
   */
  @Index('IDX_ASSET_SERIAL', { unique: true, where: '"deletedAt" IS NULL AND "serialNumber" IS NOT NULL' })
  @Column({ length: 100, nullable: true })
  serialNumber?: string;

  @Column({ length: 100, nullable: true })
  manufacturer?: string;

  @Column({ length: 100, nullable: true })
  model?: string;

  /** Model year (e.g. 2023). */
  @Column({ type: 'int', nullable: true })
  modelYear?: number;

  // ─── Classification ──────────────────────────────────────────────────────────

  @Index()
  @Column({ length: 100 })
  category: string;

  /**
   * Optional sub-category (e.g. category="IT" → subCategory="Laptop").
   */
  @Index()
  @Column({ length: 100, nullable: true })
  subCategory?: string;

  @Column({
    type: 'enum',
    enum: AssetStatus,
    default: AssetStatus.ACTIVE,
  })
  @Index()
  status: AssetStatus;

  @Column({
    type: 'enum',
    enum: AssetCondition,
    default: AssetCondition.GOOD,
  })
  condition: AssetCondition;

  /**
   * Searchable tags (e.g. ["portable", "shared", "critical"]).
   * Deduplicated and lowercased by lifecycle hook.
   */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  tags: string[];

  // ─── Financials ──────────────────────────────────────────────────────────────

  /** ISO 4217 currency code for all monetary values (e.g. "USD", "NGN"). */
  @Column({ length: 3, nullable: true, default: 'USD' })
  currency?: string;

  @Column({ type: 'date', nullable: true })
  purchaseDate?: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchaseValue?: number;

  /** Book value as of the last valuation. */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentValue?: number;

  /** Salvage / residual value at end of useful life. */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  residualValue?: number;

  /** Useful life in years — used for depreciation calculations. */
  @Column({ type: 'int', nullable: true })
  usefulLifeYears?: number;

  @Column({
    type: 'enum',
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
    nullable: true,
  })
  depreciationMethod?: DepreciationMethod;

  /** Full depreciation configuration stored as JSONB. */
  @Column({ type: 'jsonb', nullable: true })
  depreciationConfig?: DepreciationConfig;

  /** Name of the vendor / supplier the asset was purchased from. */
  @Column({ length: 200, nullable: true })
  vendor?: string;

  /** Purchase order number for procurement traceability. */
  @Column({ length: 100, nullable: true })
  purchaseOrderNumber?: string;

  /** Invoice number from the vendor. */
  @Column({ length: 100, nullable: true })
  invoiceNumber?: string;

  // ─── Warranty ────────────────────────────────────────────────────────────────

  /**
   * Denormalised expiry date for fast "expiring soon" queries.
   * Kept in sync with warrantyInfo.expiryDate by the lifecycle hook.
   */
  @Index('IDX_ASSET_WARRANTY_EXPIRY')
  @Column({ type: 'date', nullable: true })
  warrantyExpiryDate?: Date;

  /** Full warranty detail stored as JSONB. */
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

  /** ISO 8601 timestamp when the current assignment began. */
  @Column({ type: 'timestamptz', nullable: true })
  assignedAt?: Date;

  /** Expected return date for temporarily assigned assets. */
  @Column({ type: 'date', nullable: true })
  expectedReturnDate?: Date;

  /**
   * Rolling checkout history (last 50 entries).
   * Full history should be stored in a dedicated `asset_checkouts` table
   * for high-volume assets.
   */
  @Column({ type: 'jsonb', nullable: true, default: [] })
  checkoutHistory?: AssetCheckout[];

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

  /** URL to the primary photo of the asset. */
  @Column({ type: 'text', nullable: true })
  photoUrl?: string;

  /** Additional photo URLs. */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  additionalPhotoUrls: string[];

  /** URLs to manuals, certificates, invoices, etc. */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  documentUrls: string[];

  // ─── Metadata ────────────────────────────────────────────────────────────────

  /**
   * Arbitrary JSON for third-party integrations
   * (e.g. { "helpDeskTicketId": "…", "externalAssetId": "…" }).
   */
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

  /** Free-text reason for the most recent status change. */
  @Column({ type: 'text', nullable: true })
  statusChangeReason?: string;

  /** Timestamp of the most recent status change. */
  @Column({ type: 'timestamptz', nullable: true })
  statusChangedAt?: Date;

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get isAssigned(): boolean {
    return !!this.assignedToUserId;
  }

  /**
   * Depreciation to date using straight-line method.
   * Returns null if required fields are missing.
   */
  get accruedDepreciation(): number | null {
    if (
      this.purchaseValue == null ||
      this.residualValue == null ||
      this.usefulLifeYears == null ||
      !this.purchaseDate
    ) return null;

    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const ageYears  = (Date.now() - new Date(this.purchaseDate).getTime()) / msPerYear;
    const annualDep = (this.purchaseValue - this.residualValue) / this.usefulLifeYears;
    const total     = Math.min(annualDep * ageYears, this.purchaseValue - this.residualValue);

    return Math.max(0, parseFloat(total.toFixed(2)));
  }

  /**
   * Estimated current book value based on straight-line depreciation.
   * Returns currentValue when explicitly set, falls back to computed value.
   */
  get estimatedBookValue(): number | null {
    if (this.currentValue != null) return Number(this.currentValue);
    if (this.accruedDepreciation == null || this.purchaseValue == null) return null;
    return Math.max(
      this.residualValue ?? 0,
      parseFloat((Number(this.purchaseValue) - this.accruedDepreciation).toFixed(2)),
    );
  }

  get isWarrantyExpired(): boolean {
    if (!this.warrantyExpiryDate) return false;
    return new Date(this.warrantyExpiryDate) < new Date();
  }

  get isInsuranceExpired(): boolean {
    if (!this.insuranceExpiryDate) return false;
    return new Date(this.insuranceExpiryDate) < new Date();
  }

  get isMaintenanceOverdue(): boolean {
    if (!this.nextMaintenanceDue) return false;
    return new Date(this.nextMaintenanceDue) < new Date();
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

    // Deduplicate + lowercase tags
    if (this.tags) {
      this.tags = [...new Set(this.tags.map((t) => t.toLowerCase().trim()))];
    }

    // Sync denormalised warranty expiry date from JSONB
    if (this.warrantyInfo?.expiryDate) {
      this.warrantyExpiryDate = new Date(this.warrantyInfo.expiryDate);
    }

    // Sync denormalised insurance expiry date from JSONB
    if (this.insuranceInfo?.expiryDate) {
      this.insuranceExpiryDate = new Date(this.insuranceInfo.expiryDate);
    }

    // Sync denormalised maintenance due date from JSONB
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