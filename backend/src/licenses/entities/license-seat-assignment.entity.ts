import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('license_seat_assignments')
export class LicenseSeatAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column()
  licenseId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  assignedAt: Date;

  @Column({ nullable: true })
  unassignedAt?: Date;
}
