import { IsString, IsEnum, IsUUID, IsOptional, IsBoolean } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { NotificationType } from "../entities/notification.entity"

export class CreateNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string

  @ApiProperty({ description: "Notification title" })
  @IsString()
  title: string

  @ApiProperty({ description: "Notification message" })
  @IsString()
  message: string

  @ApiProperty({ description: "Type of notification", enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType

  @ApiPropertyOptional({ description: "Reference ID (e.g., asset ID, maintenance ID)" })
  @IsString()
  @IsOptional()
  referenceId?: string

  @ApiPropertyOptional({ description: "Read status" })
  @IsBoolean()
  @IsOptional()
  read?: boolean
}
