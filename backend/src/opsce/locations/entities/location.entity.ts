import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum LocationType {
  BUILDING = 'building',
  FLOOR = 'floor',
  ROOM = 'room',
  ZONE = 'zone',
}

@Entity('locations')
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: LocationType })
  type: LocationType;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'jsonb', nullable: true })
  coordinates?: Record<string, number>;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Location, (l) => l.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Location;

  @OneToMany(() => Location, (l) => l.parent)
  children: Location[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
