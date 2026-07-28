import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';
import { Notification } from '../notifications/entities/notification.entity';

/**
 * Real-time event gateway.
 *
 * Event schema:
 * - notification.new { id, userId, title, message, type, isRead, createdAt }
 *   Emitted to the private room of the target user when a notification is persisted.
 *
 * - asset.status_changed { assetId, departmentId, previousStatus, newStatus }
 *   Emitted to `department:<departmentId>` when an asset's status changes.
 *
 * - maintenance.due { maintenanceId, assetId, title, scheduledDate }
 *   Emitted to `department:<departmentId>` when a maintenance record is nearing its due date.
 */
@WebSocketGateway({
  cors: (req, callback) => {
    const configService = (EventsGateway as any).configService as ConfigService | undefined;
    const origin = configService?.get('FRONTEND_URL') || 'http://localhost:3000';
    callback(null, { origin, credentials: true });
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private static configService: ConfigService;
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    EventsGateway.configService = configService;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        throw new WsException('Missing authentication token');
      }
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'secretKey'),
      });
      if (!payload?.sub) {
        throw new WsException('Invalid token payload');
      }
      client.data.userId = payload.sub;
      client.join(`user:${payload.sub}`);
      this.logger.debug(`Client ${client.id} joined user:${payload.sub}`);
    } catch (err) {
      this.logger.warn(`WS connection rejected: ${err.message}`);
      client.disconnect(true);
      throw new WsException('Unauthorized');
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client ${client.id} disconnected`);
  }

  private extractToken(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [scheme, token] = authHeader.split(' ');
      if (scheme?.toLowerCase() === 'bearer' && token) return token;
    }
    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string') return queryToken;
    if (Array.isArray(queryToken) && queryToken.length > 0) return queryToken[0];
    return undefined;
  }

  @OnEvent('notification.new')
  emitNotificationNew(notification: Notification) {
    this.server.to(`user:${notification.userId}`).emit('notification.new', notification);
  }

  @OnEvent('asset.status_changed')
  emitAssetStatusChanged(payload: {
    assetId: string;
    departmentId?: string;
    previousStatus: string;
    newStatus: string;
  }) {
    if (payload.departmentId) {
      this.server.to(`department:${payload.departmentId}`).emit('asset.status_changed', payload);
    }
    // Also notify any user watching the asset via a public asset room.
    this.server.to(`asset:${payload.assetId}`).emit('asset.status_changed', payload);
  }

  @OnEvent('maintenance.due')
  emitMaintenanceDue(payload: {
    maintenanceId: string;
    assetId: string;
    departmentId?: string;
    title: string;
    scheduledDate: string;
  }) {
    if (payload.departmentId) {
      this.server.to(`department:${payload.departmentId}`).emit('maintenance.due', payload);
    }
    this.server.to(`asset:${payload.assetId}`).emit('maintenance.due', payload);
  }
}
