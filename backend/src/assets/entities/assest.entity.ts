import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Department } from '../../departments/department.entity';
// import { Category } from '../../categories/entities/category.entity';
import { FileUpload } from '../../file-uploads/entities/file-upload.entity';

@Entity('assets')
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchaseCost?: number;

  @Column({ type: 'date' })
  purchaseDate: Date;

  @Column({ type: 'date', nullable: true })
  warrantyEnd?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => Supplier, (supplier) => supplier.files, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'assigned_department_id' })
  assignedDepartment?: Department;

  // This should be uncommented when the category entity is created
  //   @ManyToOne(() => Category, { nullable: false })
  //   @JoinColumn({ name: 'category_id' })
  //   category: Category;

  @OneToMany(() => FileUpload, (fileUpload) => fileUpload.asset)
  files: FileUpload[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // New columns for QR/Barcode
  @Column({ type: 'text', nullable: true })
  qrCodeBase64?: string | null; // data:image/png;base64,...

  @Column({ type: 'text', nullable: true })
  barcodeBase64?: string | null; // data:image/png;base64,...

  @Column({ type: 'varchar', length: 255, nullable: true })
  qrCodeFilename?: string | null; // optional file path if you save to disk

  @Column({ type: 'varchar', length: 255, nullable: true })
  barcodeFilename?: string | null; // optional file path if you save to disk
}
