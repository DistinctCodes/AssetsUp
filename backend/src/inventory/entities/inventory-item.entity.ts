import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  categoryId?: string;

  @Column({ default: 'unit' })
  unit: string;

  @Column({ type: 'integer', default: 0 })
  quantityOnHand: number;

  @Column({ type: 'integer', default: 5 })
  reorderLevel: number;

  @Column({ type: 'integer', default: 0 })
  unitCost: number;

  @Column({ nullable: true })
  locationId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
