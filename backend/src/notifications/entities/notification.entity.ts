import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm"

export enum NotificationType {
  ASSET_ASSIGNMENT = "asset_assignment",
  ASSET_TRANSFER = "asset_transfer",
  ASSET_RETURN = "asset_return",
  MAINTENANCE_DUE = "maintenance_due",
  MAINTENANCE_COMPLETED = "maintenance_completed",
  LOW_STOCK = "low_stock",
  OUT_OF_STOCK = "out_of_stock",
  ASSET_TRANSFER_REQUEST = "asset_transfer_request",
  ASSET_TRANSFER_APPROVED = "asset_transfer_approved",
  ASSET_TRANSFER_REJECTED = "asset_transfer_rejected",
  OVERDUE_ASSET = "overdue_asset",
  ASSET_CHECKOUT = "asset_checkout",
  ASSET_CHECKIN = "asset_checkin",
  ASSET_DUE_REMINDER = "asset_due_reminder",
}

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column({ type: "uuid" })
  userId: string

  @Column()
  title: string

  @Column({ type: "text" })
  message: string

  @Column({
    type: "enum",
    enum: NotificationType,
  })
  type: NotificationType

  @Column({ type: "uuid", nullable: true })
  referenceId: string | null

  @Column({ type: "boolean", default: false })
  read: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
