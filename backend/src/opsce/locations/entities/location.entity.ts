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
  ACTIVE       = 'active',
  INACTIVE     = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  RESERVED     = 'reserved',
  DECOMMISSIONED = 'decommissioned',
}

export enum AccessLevel {
  PUBLIC      = 'public',
  RESTRICTED  = 'restricted',
  PRIVATE     = 'private',
  SECURE      = 'secure',
}

// ─── Embedded value objects ───────────────────────────────────────────────────

export interface GeoCoordinates {
  /** WGS-84 latitude (-90 to 90) */
  latitude: number;
  /** WGS-84 longitude (-180 to 180) */
  longitude: number;
  /** Altitude in metres above sea level (optional) */
  altitudeM?: number;
}

export interface IndoorCoordinates {
  /** X position in metres from the floor origin */
  x: number;
  /** Y position in metres from the floor origin */
  y: number;
  /** Floor number (0 = ground) */
  floor?: number;
}

export interface OperatingHours {
  /** ISO 8601 time, e.g. "08:00" */
  open: string;
  /** ISO 8601 time, e.g. "18:00" */
  close: string;
  /** Days this schedule applies to: 0=Sun … 6=Sat */
  days: number[];
  /** IANA timezone, e.g. "Africa/Lagos" */
  timezone: string;
}

export interface LocationDimensions {
  /** Width in metres */
  widthM?: number;
  /** Length in metres */
  lengthM?: number;
  /** Height in metres */
  heightM?: number;
  /** Total area in square metres (may be set independently of width/length) */
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
@Check(
  `"currentOccupancy" IS NULL OR "capacity" IS NULL OR "currentOccupancy" <= "capacity"`,
)
export class Location {

  // ─── Identity ───────────────────────────────────────────────────────────────

  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Human-readable name — unique among non-deleted siblings of the same parent.
   * Full uniqueness is enforced by a partial index.
   */
  @Index('IDX_LOC_NAME_ACTIVE', { where: '"deletedAt" IS NULL' })
  @Column({ length: 200 })
  name: string;

  /**
   * Short, uppercase location code for signage / integrations.
   * e.g. "B3-F2-R14". Must match LOCATION_CODE_PATTERN.
   */
  @Index('IDX_LOC_CODE_ACTIVE', { where: '"deletedAt" IS NULL AND "code" IS NOT NULL' })
  @Column({ length: 30, nullable: true })
  code?: string;

  @Column({ type: 'enum', enum: LocationType })
  type: LocationType;

  @Column({
    type: 'enum',
    enum: LocationStatus,
    default: LocationStatus.ACTIVE,
  })
  status: LocationStatus;

  @Column({
    type: 'enum',
    enum: AccessLevel,
    default: AccessLevel.PUBLIC,
  })
  accessLevel: AccessLevel;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // ─── Hierarchy / materialized path ─────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  /**
   * Materialized path for O(1) ancestor queries and O(depth) subtree queries.
   * Format: /<root-id>/…/<parent-id>/<this-id>/
   */
  @Index('IDX_LOC_PATH')
  @Column({ type: 'text', nullable: true })
  path?: string;

  /** Nesting depth — 0 for root locations (campus / standalone building). */
  @Column({ type: 'int', default: 0 })
  depth: number;

  @ManyToOne(() => Location, (l) => l.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Location;

  @OneToMany(() => Location, (l) => l.parent, { cascade: ['soft-remove'] })
  children: Location[];

  // ─── Physical attributes ────────────────────────────────────────────────────

  /** Physical mailing / street address (buildings / campus level). */
  @Column({ type: 'text', nullable: true })
  address?: string;

  /** Floor number within a building (relevant for FLOOR / ROOM / ZONE / DESK). */
  @Column({ type: 'int', nullable: true })
  floorNumber?: number;

  /** Room / suite number as a string to accommodate "3A", "B-12", etc. */
  @Column({ length: 20, nullable: true })
  roomNumber?: string;

  /** Maximum number of people allowed in this location simultaneously. */
  @Column({ type: 'int', nullable: true })
  capacity?: number;

  /** Live occupancy count — updated by an IoT or booking service. */
  @Column({ type: 'int', nullable: true, default: 0 })
  currentOccupancy?: number;

  /** Physical dimensions stored as a JSONB object. */
  @Column({ type: 'jsonb', nullable: true })
  dimensions?: LocationDimensions;

  // ─── Coordinates ────────────────────────────────────────────────────────────

  /**
   * WGS-84 geographic coordinates for outdoor / campus-level locations.
   * Stored as JSONB; migrate to PostGIS `geography` type for spatial queries.
   */
  @Column({ type: 'jsonb', nullable: true })
  geoCoordinates?: GeoCoordinates;

  /**
   * Indoor positioning coordinates (e.g. from a BLE / UWB system).
   */
  @Column({ type: 'jsonb', nullable: true })
  indoorCoordinates?: IndoorCoordinates;

  // ─── Operations ─────────────────────────────────────────────────────────────

  /** Weekly operating schedule. Multiple entries support split shifts. */
  @Column({ type: 'jsonb', nullable: true })
  operatingHours?: OperatingHours[];

  /**
   * Tags for flexible filtering (e.g. ["wheelchair-accessible", "projector"]).
   * Stored as a simple text array.
   */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  tags: string[];

  /**
   * Amenities available at this location (e.g. ["wifi", "whiteboard", "parking"]).
   */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  amenities: string[];

  // ─── Managed-by ─────────────────────────────────────────────────────────────

  /**
   * Users responsible for managing this location (facility managers, admins).
   */
  @ManyToMany(() => User, { cascade: false, eager: false })
  @JoinTable({
    name: 'location_managers',
    joinColumn:        { name: 'locationId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId',     referencedColumnName: 'id' },
  })
  managers: User[];

  // ─── Media ──────────────────────────────────────────────────────────────────

  /** URL to the floor-plan image / SVG for this location. */
  @Column({ type: 'text', nullable: true })
  floorPlanUrl?: string;

  /** URLs to photos of this location. */
  @Column({ type: 'text', array: true, nullable: true, default: [] })
  photoUrls: string[];

  // ─── Metadata ───────────────────────────────────────────────────────────────

  /**
   * Arbitrary JSON for third-party integrations
   * (e.g. { "calendarRoomId": "…", "accessControlId": "…" }).
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, unknown>;

  // ─── Legacy compatibility ───────────────────────────────────────────────────

  /**
   * Kept for backwards compatibility — prefer `status` for new code.
   * Synced with status in the BeforeInsert / BeforeUpdate hook.
   */
  @Column({ default: true })
  isActive: boolean;

  // ─── Audit ──────────────────────────────────────────────────────────────────

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  /**
   * Soft-delete timestamp.
   * TypeORM excludes soft-deleted rows from all queries unless
   * `.withDeleted()` is explicitly used.
   */
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

  /**
   * Occupancy as a percentage (0–100), or null if capacity is unset.
   */
  get occupancyPct(): number | null {
    if (this.capacity == null || this.capacity === 0) return null;
    return Math.min(100, Math.round(((this.currentOccupancy ?? 0) / this.capacity) * 100));
  }

  /**
   * True when currentOccupancy >= capacity (and both are set).
   */
  get isAtCapacity(): boolean {
    if (this.capacity == null) return false;
    return (this.currentOccupancy ?? 0) >= this.capacity;
  }

  /**
   * Ordered array of ancestor IDs from root to immediate parent.
   */
  get ancestorIds(): string[] {
    if (!this.path) return [];
    return this.path.split('/').filter(Boolean).slice(0, -1);
  }

  // ─── Lifecycle hooks ─────────────────────────────────────────────────────────

  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields(): void {
    // Trim strings
    if (this.name)        this.name        = this.name.trim();
    if (this.description) this.description = this.description.trim();
    if (this.address)     this.address     = this.address.trim();

    // Uppercase + trim code
    if (this.code) {
      this.code = this.code.toUpperCase().trim();
      if (!LOCATION_CODE_PATTERN.test(this.code)) {
        throw new Error(
          `Location code "${this.code}" is invalid. Must match ${LOCATION_CODE_PATTERN.source}`,
        );
      }
    }

    // Sync legacy isActive with status
    this.isActive = this.status === LocationStatus.ACTIVE;

    // Deduplicate tags and amenities
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