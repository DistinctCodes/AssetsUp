import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger, UnauthorizedException } from '@nestjs/common';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  createdAt: string;
  relatedTransferId?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedClients = new Map<string, Socket>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;

      if (!token) {
        this.logger.warn(`WebSocket connection rejected: No token provided from ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'change-me-in-env'),
      });

      const userId = payload.sub || payload.id;
      if (!userId) {
        this.logger.warn(`WebSocket connection rejected: Invalid token payload from ${client.id}`);
        client.disconnect();
        return;
      }

      client.data.userId = userId;
      this.connectedClients.set(client.id, client);
      client.join(`user:${userId}`);

      this.logger.log(`Client ${client.id} connected for user ${userId}`);
    } catch (error) {
      this.logger.error(`WebSocket connection rejected: Invalid token from ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user:${data.userId}`);
    return { event: 'joined', userId: data.userId };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`user:${data.userId}`);
    return { event: 'left', userId: data.userId };
  }

  emitAssetUpdated(assetId: string, changedFields: string[]) {
    this.server.to(`asset:${assetId}`).emit('asset.updated', { assetId, changedFields });
    this.logger.log(`Emitted asset.updated for asset ${assetId}: ${changedFields.join(', ')}`);
  }

  emitNotification(userId: string, notification: Notification) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  emitTransferCreated(transferId: string, data: any) {
    this.server.emit('transfer_created', { transferId, ...data });
  }

  emitTransferApproved(transferId: string, data: any) {
    this.server.emit('transfer_approved', { transferId, ...data });
  }

  emitTransferRejected(transferId: string, data: any) {
    this.server.emit('transfer_rejected', { transferId, ...data });
  }

  emitTransferCancelled(transferId: string, data: any) {
    this.server.emit('transfer_cancelled', { transferId, ...data });
  }

  emitTransferExecuted(transferId: string, data: any) {
    this.server.emit('transfer_executed', { transferId, ...data });
  }

  emitMaintenanceAlert(assetId: string, alert: any) {
    this.server.emit('maintenance_alert', { assetId, ...alert });
  }

  joinAssetRoom(client: Socket, assetId: string) {
    client.join(`asset:${assetId}`);
  }

  leaveAssetRoom(client: Socket, assetId: string) {
    client.leave(`asset:${assetId}`);
  }
}