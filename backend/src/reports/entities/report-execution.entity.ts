import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';
import { ReportFormat } from './scheduled-report.entity';

export enum ExecutionStatus {
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

@Entity('report_executions')
export class ReportExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, { eager: true })
  report: Report;

  @ManyToOne(() => User, { eager: true })
  executedBy: User;

  @Column({
    type: 'enum',
    enum: ExecutionStatus,
    default: ExecutionStatus.RUNNING,
  })
  status: ExecutionStatus;

  @Column('jsonb')
  parameters: Record<string, any>;

  @Column({ default: 0 })
  resultCount: number;

  @Column({ default: 0 })
  executionTime: number; // milliseconds

  @Column({ nullable: true })
  fileUrl: string;

  @Column({ nullable: true })
  fileSize: number; // bytes

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  format: ReportFormat;

  @Column('text', { nullable: true })
  error: string;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;
}