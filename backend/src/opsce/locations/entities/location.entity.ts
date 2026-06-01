import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
  Index,
  Check,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// ─── Constants ────────────────────────────────────────────────────────────────

export const MAX_LOCATION_DEPTH = 6;
export const LOCATION_CODE_PATTERN = /^[A-Z0-9_-]{1,30}$/;

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum LocationType {
  CAMPUS   = 'campus',
  BUILDING = 'building',
  FLOOR    = 'floor',
  WING     = 'wing',
  ROOM     = 'room',
  ZONE     = 'zone',
  DESK     = 'desk',
  OUTDOOR  = 'outdoor',
}

export enum LocationStatus {
  ACTIVE            = 'active',
  INACTIVE          = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  RESERVED          = 'reserved',
  DECOMMISSIONED    = 'decommissioned',
}

export enum AccessLevel {
  PUBLIC     = 'public',
  RESTRICTED = 'restricted',
  PRIVATE    = 'private',
  SECURE     = 'secure',
}

// ─── Embedded value objects ───────────────────────────────────────────────────

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitudeM?: number;
}

export interface IndoorCoordinates {
  x: number;
  y: number;
  floor?: number;
}

export interface OperatingHours {
  open: string;
  close: string;
  days: number[];
  timezone: string;
}

export interface LocationDimensions {
  widthM?: number;
  lengthM?: number;
  heightM?: number;
  areaM2?: number;
}

// ─── Entity ───────────────────────────────────────────────────────────────────

@Entity('locations')
@Index('IDX_LOC_PARENT_STATUS', ['parentId', 'status'])
@Index('IDX_LOC_TYPE_ACTIVE',   ['type', 'isActive'])
@Index('IDX_LOC_DELETED_AT',    ['deletedAt'])
@Check(`"name" <> ''`)
@Check(`"capacity" IS NULL OR "capacity" >= 0`)
@Check(`"currentOccupancy" IS NULL OR "currentOccupancy" >= 0`)
@Check(`"currentOccupancy" IS NULL OR "capacity" IS NULL OR "currentOccupancy" <= "capacity"`)
export class Location {

  // ─── Identity ───────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('IDX_LOC_NAME_ACTIVE', { where: '"deletedAt" IS NULL' })
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index('IDX_LOC_CODE_ACTIVE', { where: '"deletedAt" IS NULL AND "code" IS NOT NULL' })
  @Column({ length: 30, nullable: true })
  code?: string;

  @Column({ type: 'enum', enum: LocationType })
  type: LocationType;

  @Column({ type: 'enum', enum: LocationStatus, default: LocationStatus.ACTIVE })
  status: LocationStatus;

  @Column({ type: 'enum', enum: AccessLevel, default: AccessLevel.PUBLIC })
  accessLevel: AccessLevel;

  // ─── Hierarchy / materialized path ─────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Index('IDX_LOC_PATH')
  @Column({ type: 'text', nullable: true })
  path?: string;

  @Column({ type: 'int', default: 0 })
  depth: number;

  @ManyToOne(() => Location, (l) => l.children, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parentId' })
  parent?: Location;

  @OneToMany(() => Location, (l) => l.parent, { cascade: ['soft-remove'] })
  children: Location[];

  // ─── Physical attributes ────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ type: 'int', nullable: true })
  floorNumber?: number;

  @Column({ length: 20, nullable: true })
  roomNumber?: string;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ type: 'int', nullable: true, default: 0 })
  currentOccupancy?: number;

  @Column({ type: 'jsonb', nullable: true })
  dimensions?: LocationDimensions;

  // ─── Coordinates ────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  geoCoordinates?: GeoCoordinates;

  @Column({ type: 'jsonb', nullable: true })
  indoorCoordinates?: IndoorCoordinates;

  // ─── Operations ─────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  operatingHours?: OperatingHours[];

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  tags: string[];

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  amenities: string[];

  // ─── Managed-by ─────────────────────────────────────────────────────────────

  @ManyToMany(() => User, { cascade: false, eager: false })
  @JoinTable({
    name: 'location_managers',
    joinColumn:        { name: 'locationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId',     referencedColumnName: 'id' },
  })
  managers: User[];

  // ─── Media ──────────────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  floorPlanUrl?: string;

  @Column({ type: 'text', array: true, nullable: true, default: [] })
  photoUrls: string[];

  // ─── Metadata ───────────────────────────────────────────────────────────────

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ─── Legacy compatibility ───────────────────────────────────────────────────

  @Column({ default: true })
  isActive: boolean;

  // ─── Audit ──────────────────────────────────────────────────────────────────

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

  // ─── Computed helpers ────────────────────────────────────────────────────────

  get isDeleted(): boolean {
    return !!this.deletedAt;
  }

  get isRoot(): boolean {
    return !this.parentId;
  }

  get occupancyPct(): number | null {
    if (this.capacity == null || this.capacity === 0) return null;
    return Math.min(100, Math.round(((this.currentOccupancy ?? 0) / this.capacity) * 100));
  }

  get isAtCapacity(): boolean {
    if (this.capacity == null) return false;
    return (this.currentOccupancy ?? 0) >= this.capacity;
  }

  get ancestorIds(): string[] {
    if (!this.path) return [];
    return this.path.split('/').filter(Boolean).slice(0, -1);
  }

  // ─── Lifecycle hooks ─────────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields(): void {
    if (this.name)        this.name        = this.name.trim();
    if (this.description) this.description = this.description.trim();
    if (this.address)     this.address     = this.address.trim();

    if (this.code) {
      this.code = this.code.toUpperCase().trim();
      if (!LOCATION_CODE_PATTERN.test(this.code)) {
        throw new Error(
          `Location code "${this.code}" is invalid. Must match ${LOCATION_CODE_PATTERN.source}`,
        );
      }
    }

    this.isActive = this.status === LocationStatus.ACTIVE;

    if (this.tags)      this.tags      = [...new Set(this.tags.map((t) => t.toLowerCase().trim()))];
    if (this.amenities) this.amenities = [...new Set(this.amenities.map((a) => a.toLowerCase().trim()))];
  }

  @BeforeInsert()
  @BeforeUpdate()
  validateCoordinates(): void {
    if (this.geoCoordinates) {
      const { latitude: lat, longitude: lng } = this.geoCoordinates;
      if (lat < -90 || lat > 90) {
        throw new Error(`Invalid latitude ${lat}: must be between -90 and 90`);
      }
      if (lng < -180 || lng > 180) {
        throw new Error(`Invalid longitude ${lng}: must be between -180 and 180`);
      }
    }
  }
}
