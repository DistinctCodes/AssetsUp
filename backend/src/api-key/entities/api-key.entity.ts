/* eslint-disable prettier/prettier */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from 'src/companies/entities/company.entity'; 
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @ManyToOne(() => Company, (company) => company.apiKeys, { onDelete: 'CASCADE' })
  company: Company;

  @Column({ default: 'active' })
  status: 'active' | 'revoked';

  @Column({ type: 'timestamp', nullable: true })
  expiryDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

