import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  parentCategoryId?: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  defaultDepreciationRate: number;

  @Column({ default: 36 })
  defaultUsefulLifeMonths: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
