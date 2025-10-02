import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InventoryItem } from '../../inventory-items/entities/inventory-item.entity'; // Assuming this path

export enum MovementType {
  IN = 'IN', // Stock coming in (e.g., from a supplier)
  OUT = 'OUT', // Stock going out (e.g., used for a job, sold)
}

@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  itemId: string;

  @ManyToOne(() => InventoryItem)
  @JoinColumn({ name: 'itemId' })
  item: InventoryItem;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  type: MovementType;

  @Column({ type: 'int' })
  quantity: number; // Always a positive integer

  @Column()
  initiatedBy: string; // e.g., employee ID or username

  @CreateDateColumn()
  date: Date;
}