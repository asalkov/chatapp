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
import { Logger, Injectable } from '@nestjs/common';
import { Socket, Server } from 'socket.io';
import { MessageService } from './database/message.service';

interface UserData {
  username: string;
  connectedAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AppGateway');
  private users: Map<string, UserData> = new Map(); // socketId -> userData

  constructor(private readonly messageService: MessageService) {}

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string },
  ): { success: boolean; message?: string } {
    const username = data.username.trim();

    // Validate username
    if (!username || username.length < 2) {
      return {
        success: false,
        message: 'Username must be at least 2 characters',
      };
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

    // Send persisted messages to the user
    this.sendPersistedMessages(client, username);

    return { success: true };
  }

  private broadcastUserList() {
    const userList = Array.from(this.users.entries()).map(([id, u]) => ({
      username: u.username,
      id,
    }));
    this.logger.log(`Broadcasting user list: ${JSON.stringify(userList)}`);
    this.server.emit('userList', userList);
  }

  @SubscribeMessage('privateMessage')
  handlePrivateMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { to: string; message: string },
  ): void {
    const sender = this.users.get(client.id);
    const recipientSocketId = data.to;
    const recipient = this.users.get(recipientSocketId);

    if (!sender) {
      client.emit('error', { message: 'Not registered' });
      return;
    }

    if (!recipient) {
      client.emit('error', { message: 'User not found or disconnected' });
      return;
    }

    const timestamp = new Date();

    // Save message to database
    const savedMessage = this.messageService.saveMessage({
      sender: sender.username,
      recipient: recipient.username,
      message: data.message,
      timestamp,
      isPrivate: true,
      read: false,
    });

    const payload = {
      sender: sender.username,
      message: data.message,
      isPrivate: true,
      fromId: client.id,
      timestamp: timestamp.toISOString(),
      messageId: savedMessage.id,
    };

    // Send to recipient
    this.server.to(recipientSocketId).emit('msgToClient', payload);

    // Send back to sender (so they see their own message in the private chat)
    client.emit('msgToClient', {
      ...payload,
      toId: recipientSocketId, // Mark who it was sent to
      recipient: recipient.username, // Explicitly tell sender who the recipient is
    });

    this.logger.log(
      `Message saved and sent: ${sender.username} -> ${recipient.username}`,
    );
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

  @SubscribeMessage('adminGetAllChats')
  handleAdminGetAllChats(@ConnectedSocket() client: Socket): {
    success: boolean;
    chats?: any;
    message?: string;
  } {
    const admin = this.users.get(client.id);

    // Verify admin is logged in
    if (!admin) {
      return { success: false, message: 'Not authenticated' };
    }

    // Verify admin username (simple check - in production use proper auth)
    if (admin.username.toLowerCase() !== 'admin') {
      this.logger.warn(`Unauthorized getAllChats attempt by ${admin.username}`);
      return {
        success: false,
        message: 'Unauthorized: Admin privileges required',
      };
    }

    // Get all messages from the database
    const allMessages = this.messageService.getAllMessages();

    // Convert Map to object for JSON serialization
    const chatsObject: Record<string, any[]> = {};
    allMessages.forEach((messages, username) => {
      chatsObject[username] = messages.map((msg) => ({
        id: msg.id,
        sender: msg.sender,
        recipient: msg.recipient,
        message: msg.message,
        timestamp: msg.timestamp.toISOString(),
        isPrivate: msg.isPrivate,
        read: msg.read,
      }));
    });

    this.logger.log(`Admin ${admin.username} retrieved all chats`);
    return { success: true, chats: chatsObject };
  }

  @SubscribeMessage('adminRemoveUser')
  handleAdminRemoveUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string; adminUsername: string },
  ): { success: boolean; message?: string } {
    const admin = this.users.get(client.id);

    // Verify admin is logged in
    if (!admin) {
      return { success: false, message: 'Not authenticated' };
    }

    // Verify admin username (simple check - in production use proper auth)
    if (admin.username.toLowerCase() !== 'admin') {
      this.logger.warn(`Unauthorized remove attempt by ${admin.username}`);
      return {
        success: false,
        message: 'Unauthorized: Admin privileges required',
      };
    }

    const usernameToRemove = data.username;

    // Find the user to remove
    const userEntry = Array.from(this.users.entries()).find(
      ([_, userData]) => userData.username === usernameToRemove,
    );

    if (!userEntry) {
      return { success: false, message: 'User not found' };
    }

    const [socketId, userData] = userEntry;

    // Remove user from the map
    this.users.delete(socketId);

    this.logger.log(
      `Admin ${admin.username} removed user: ${usernameToRemove} (${socketId})`,
    );

    // Disconnect the user's socket
    const targetSocket = this.server.sockets.sockets.get(socketId);
    if (targetSocket) {
      targetSocket.emit('removedByAdmin', {
        message: 'You have been removed by an administrator',
      });
      targetSocket.disconnect(true);
    }

    // Notify all clients about user removal
    this.server.emit('userRemoved', {
      username: usernameToRemove,
      removedBy: 'admin',
    });

    // Broadcast updated user list
    this.broadcastUserList();

    // Delete user's messages from database
    this.messageService.deleteUserMessages(usernameToRemove);

    return {
      success: true,
      message: `User ${usernameToRemove} removed successfully`,
    };
  }

  private sendPersistedMessages(client: Socket, username: string): void {
    const messages = this.messageService.getMessagesForUser(username);

    if (messages.length > 0) {
      this.logger.log(
        `Sending ${messages.length} persisted messages to ${username}`,
      );

      // Group messages by conversation partner
      const conversations = new Map<string, any[]>();

      messages.forEach((msg) => {
        const partner = msg.sender === username ? msg.recipient : msg.sender;
        if (!conversations.has(partner)) {
          conversations.set(partner, []);
        }

        conversations.get(partner)!.push({
          sender: msg.sender,
          recipient: msg.recipient,
          message: msg.message,
          timestamp: msg.timestamp.toISOString(),
          isPrivate: msg.isPrivate,
          messageId: msg.id,
        });
      });

      // Send all messages to client
      client.emit('persistedMessages', {
        conversations: Object.fromEntries(conversations),
        totalMessages: messages.length,
      });
    }
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleDisconnect(client: Socket) {
    const user = this.users.get(client.id);
    if (user) {
      this.logger.log(`User disconnected: ${user.username} (${client.id})`);
      this.users.delete(client.id);
      this.server.emit('userLeft', {
        username: user.username,
        userCount: this.users.size,
      });
      this.broadcastUserList();
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }
}
