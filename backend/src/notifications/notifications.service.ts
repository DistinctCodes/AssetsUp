import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private server: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emit(event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`Cannot emit '${event}': WebSocket server not initialized`);
      return;
    }
    this.server.emit(event, payload);
    this.logger.debug(`Emitted event '${event}'`);
  }
}
