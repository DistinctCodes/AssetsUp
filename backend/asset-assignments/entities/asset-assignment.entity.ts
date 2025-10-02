import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('asset_assignments')
export class AssetAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  assetId: string;

  @Column({ nullable: true })
  assignedToUserId?: string;

  @Column({ nullable: true })
  assignedToDepartmentId?: string;

  @Column({ type: 'timestamp' })
  assignmentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  unassignmentDate?: Date; // This field tracks the history. Null means it's the current assignment.
}