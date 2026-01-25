import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Report } from './report.entity';
import { User } from '../../users/entities/user.entity';

export enum ReportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
}

export enum DeliveryMethod {
  EMAIL = 'EMAIL',
  WEBHOOK = 'WEBHOOK',
  FTP = 'FTP',
}

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Report, { eager: true })
  report: Report;

  @Column()
  schedule: string; // cron expression

  @Column({
    type: 'enum',
    enum: ReportFormat,
    default: ReportFormat.PDF,
  })
  format: ReportFormat;

  @Column('simple-array')
  recipients: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date;

  @Column({
    type: 'enum',
    enum: DeliveryMethod,
    default: DeliveryMethod.EMAIL,
  })
  deliveryMethod: DeliveryMethod;

  @Column({ nullable: true })
  webhookUrl: string;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}