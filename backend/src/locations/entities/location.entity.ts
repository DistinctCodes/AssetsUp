import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LocationType {
  BUILDING = 'BUILDING',
  FLOOR = 'FLOOR',
  ROOM = 'ROOM',
  STORAGE = 'STORAGE',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: LocationType, default: LocationType.BUILDING })
  type: LocationType;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  parentLocationId?: string;

  @Column({ nullable: true })
  branchId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
