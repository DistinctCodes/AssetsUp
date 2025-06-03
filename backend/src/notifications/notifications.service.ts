import { Injectable } from "@nestjs/common"
import type { Repository } from "typeorm"
import { Notification, NotificationType } from "./entities/notification.entity"
import type { CreateNotificationDto } from "./dto/create-notification.dto"

@Injectable()
export class NotificationsService {
  constructor(private notificationsRepository: Repository<Notification>) {}

  async createNotification(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create(createNotificationDto)
    return this.notificationsRepository.save(notification)
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    })
  }

  async findUnreadForUser(userId: string): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: { userId, read: false },
      order: { createdAt: "DESC" },
    })
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id } })
    notification.read = true
    return this.notificationsRepository.save(notification)
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true })
      .where("userId = :userId AND read = :read", { userId, read: false })
      .execute()
  }

  async sendLowStockAlert(inventoryItem: any): Promise<void> {
    // Find all admin and asset manager users
    // This would typically be done by injecting the UsersService
    // For now, we'll just log the alert
    console.log(
      `LOW STOCK ALERT: ${inventoryItem.name} is low on stock. Current quantity: ${inventoryItem.quantity}, Reorder point: ${inventoryItem.reorderPoint}`,
    )

    // In a real implementation, you would:
    // 1. Get all admin and asset manager users
    // 2. Create a notification for each user
    // 3. Optionally send emails or other alerts
  }

  async sendOverdueAssetNotification(asset: any, userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: "Overdue Asset",
      message: `The asset ${asset.name} (${asset.assetTag}) is overdue for return.`,
      type: NotificationType.OVERDUE_ASSET,
      referenceId: asset.id,
    })
  }

  async sendMaintenanceDueNotification(asset: any, maintenanceId: string, userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: "Maintenance Due",
      message: `Maintenance is due for asset ${asset.name} (${asset.assetTag}).`,
      type: NotificationType.MAINTENANCE_DUE,
      referenceId: maintenanceId,
    })
  }
}
