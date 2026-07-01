import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  name: string;

  @Column()
  keyHash: string;

  @Column({ length: 8 })
  prefix: string;

  @Column('text', { array: true, default: [] })
  scopes: string[];

  @Column({ nullable: true, type: 'timestamp' })
  lastUsedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
