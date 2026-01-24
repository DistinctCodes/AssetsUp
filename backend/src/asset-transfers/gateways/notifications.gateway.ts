import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    // In a real implementation, you would authenticate the user
    // and associate the socket with their user ID
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove user from sockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(client: Socket, payload: { userId: string }) {
    client.join(`user_${payload.userId}`);
    this.userSockets.set(payload.userId, client.id);
    return { success: true };
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(client: Socket, payload: { userId: string }) {
    client.leave(`user_${payload.userId}`);
    this.userSockets.delete(payload.userId);
    return { success: true };
  }

  // Methods to emit notifications to users
  sendTransferCreated(userId: string, transferData: any) {
    this.server.to(`user_${userId}`).emit('transfer_created', transferData);
  }

  sendTransferApproved(userId: string, transferData: any) {
    this.server.to(`user_${userId}`).emit('transfer_approved', transferData);
  }

  sendTransferRejected(userId: string, transferData: any) {
    this.server.to(`user_${userId}`).emit('transfer_rejected', transferData);
  }

  sendTransferCancelled(userId: string, transferData: any) {
    this.server.to(`user_${userId}`).emit('transfer_cancelled', transferData);
  }

  sendTransferExecuted(userId: string, transferData: any) {
    this.server.to(`user_${userId}`).emit('transfer_executed', transferData);
  }

  // Broadcast to all users in a department
  broadcastToDepartment(departmentId: number, event: string, data: any) {
    this.server.to(`department_${departmentId}`).emit(event, data);
  }

  // Send notification to specific user
  sendNotification(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
  }
}