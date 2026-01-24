import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum HistoryAction {
  CREATED = 'created',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXECUTED = 'executed',
  MODIFIED = 'modified'
}

@Entity('transfer_history')
export class TransferHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  transferId: string;

  @Column()
  assetId: string;

  @Column()
  actorId: string;

  @Column({
    type: 'enum',
    enum: HistoryAction
  })
  action: HistoryAction;

  @Column({ type: 'json', nullable: true })
  changes: any;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  timestamp: Date;
}