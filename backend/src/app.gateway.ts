import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

interface UserData {
  username: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  private users: Map<string, UserData> = new Map(); // socketId -> userData

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string },
  ): { success: boolean; message?: string } {
    const username = data.username.trim();

    // Validate username
    if (!username || username.length < 2) {
      return { success: false, message: 'Username must be at least 2 characters' };
    }

    // Check if username is already taken
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    );

    if (existingUser) {
      return { success: false, message: 'Username already taken' };
    }

    // Register user
    this.users.set(client.id, {
      username,
      connectedAt: new Date(),
    });

    this.logger.log(`User registered: ${username} (${client.id})`);

    // Notify everyone
    this.logger.log(`Notifying everyone that user joined: ${username}`);
    this.server.emit('userJoined', { username, userCount: this.users.size });

    // Broadcast updated user list
    this.broadcastUserList();

    return { success: true };
  }

  private broadcastUserList() {
    const userList = Array.from(this.users.values()).map((u) => u.username);
    this.logger.log(`Broadcasting user list: ${JSON.stringify(userList)}`);
    this.server.emit('userList', userList);
  }

  @SubscribeMessage('msgToServer')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ): void {
    const user = this.users.get(client.id);

    if (!user) {
      client.emit('error', { message: 'Not registered. Please login first.' });
      return;
    }

    // Backend controls the sender field
    this.logger.log(`Sending message from ${user.username}: ${data.message}`);
    this.server.emit('msgToClient', {
      sender: user.username,
      message: data.message,
    });
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      this.logger.log(`User disconnected: ${user.username} (${client.id})`);
      this.users.delete(client.id);
      this.server.emit('userLeft', { username: user.username, userCount: this.users.size });
      this.broadcastUserList();
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
