// src/transfers/entities/transfer-approval-rule.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { User } from '../../users/entities/user.entity';

export interface ApprovalConditions {
  minValue?: number;
  maxValue?: number;
  categories?: string[];
  departments?: string[];
  requiresAllConditions?: boolean;
}

@Entity('transfer_approval_rules')
export class TransferApprovalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb')
  conditions: ApprovalConditions;

  @ManyToOne(() => Role)
  approverRole: Role;

  @ManyToOne(() => User, { nullable: true })
  approverUser: User;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  priority: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
