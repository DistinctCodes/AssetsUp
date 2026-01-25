import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ReportType {
  PREDEFINED = 'PREDEFINED',
  CUSTOM = 'CUSTOM',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ReportType,
    default: ReportType.CUSTOM,
  })
  type: ReportType;

  @Column({ nullable: true })
  template: string;

  @Column('jsonb')
  configuration: {
    fields: string[];
    filters?: Record<string, any>;
    groupBy?: string;
    aggregations?: Array<{
      field: string;
      operation: 'SUM' | 'COUNT' | 'AVG' | 'MIN' | 'MAX';
      alias: string;
    }>;
    sorting?: Array<{
      field: string;
      order: 'ASC' | 'DESC';
    }>;
    limit?: number;
  };

  @Column({ default: false })
  isPublic: boolean;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'report_shares',
    joinColumn: { name: 'report_id' },
    inverseJoinColumn: { name: 'user_id' },
  })
  sharedWith: User[];

  @Column({ nullable: true })
  category: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column({ default: 0 })
  executionCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @Column({ default: 0 })
  averageExecutionTime: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}