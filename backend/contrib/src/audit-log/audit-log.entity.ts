import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_log')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column()
  statusCode: number;

  @Column({ nullable: true })
  ipAddress: string | null;

  @Column({ nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
