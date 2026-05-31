import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  code?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => Department, (d) => d.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Department;

  @OneToMany(() => Department, (d) => d.parent)
  children: Department[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
