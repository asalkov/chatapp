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
import { InvitationService } from './database/invitation.service';
import { UserService } from './database/user.service';

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

  constructor(
    private readonly messageService: MessageService,
    private readonly invitationService: InvitationService,
    private readonly userService: UserService,
  ) {}

  @SubscribeMessage('registerUser')
  async handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string; email: string; password: string },
  ): Promise<{ success: boolean; message?: string }> {
    const username = data.username?.trim();
    const email = data.email?.trim();
    const password = data.password;

    // Validate inputs
    if (!username || username.length < 2) {
      return {
        success: false,
        message: 'Username must be at least 2 characters',
      };
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        success: false,
        message: 'Valid email is required',
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        message: 'Password must be at least 6 characters',
      };
    }

    try {
      // Create user in database
      await this.userService.createUser({ username, email, password });

      // Connect the socket session
      this.connectUserSession(client, username);

      return { success: true };
    } catch (error) {
      this.logger.error(`Registration failed: ${error.message}`);
      return {
        success: false,
        message: error.message || 'Registration failed',
      };
    }
  }

  @SubscribeMessage('loginUser')
  async handleLoginUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string; password: string },
  ): Promise<{ success: boolean; message?: string }> {
    const username = data.username?.trim();
    const password = data.password;

    // Validate inputs
    if (!username || !password) {
      return {
        success: false,
        message: 'Username and password are required',
      };
    }

    // Find user in database
    const user = this.userService.findByUsername(username);
    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password',
      };
    }

    // Validate password
    const isPasswordValid = await this.userService.validatePassword(
      password,
      user.password,
    );
    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid username or password',
      };
    }

    // Update last login
    this.userService.updateLastLogin(user.id);

    // Connect the socket session
    this.connectUserSession(client, username);

    return { success: true };
  }

  private connectUserSession(client: Socket, username: string): void {
    // Check if username is already connected
    const existingEntry = Array.from(this.users.entries()).find(
      ([socketId, u]) => u.username.toLowerCase() === username.toLowerCase(),
    );

    if (existingEntry) {
      const [existingSocketId] = existingEntry;

      // If it's the same socket reconnecting, allow it
      if (existingSocketId === client.id) {
        this.logger.log(`User ${username} reconnecting with same socket ID`);
      } else {
        // Disconnect the old session and allow the new one
        this.logger.log(
          `User ${username} connecting from new session, disconnecting old session`,
        );
        const oldSocket = this.server.sockets.sockets.get(existingSocketId);
        if (oldSocket) {
          oldSocket.emit('error', {
            message: 'You have been logged in from another location',
          });
          oldSocket.disconnect(true);
        }
        this.users.delete(existingSocketId);
      }
    }

    // Register socket session
    this.users.set(client.id, {
      username,
      connectedAt: new Date(),
    });

    this.logger.log(`User connected: ${username} (${client.id})`);

    // Notify everyone
    this.server.emit('userJoined', { username, userCount: this.users.size });

    // Broadcast updated user list
    this.broadcastUserList();

    // Send persisted messages to the user
    this.sendPersistedMessages(client, username);
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
    this.logger.log(
      `Private message: ${data.message} to ${data.to} from ${client.id}`,
    );

    const sender = this.users.get(client.id);
    const recipientSocketId = data.to;
    const recipient = this.users.get(recipientSocketId);

    if (!sender) {
      client.emit('error', { message: 'Not registered' });
      return;
    }

    if (!recipient) {
      this.logger.log(`Recipient not found: ${data.to}`);
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
      ([, userData]) => userData.username === usernameToRemove,
    );

    if (!userEntry) {
      return { success: false, message: 'User not found' };
    }

    const [socketId] = userEntry;

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
      const messagePreview = messages.map(m => `${m.sender}->${m.recipient}: "${m.message}"`).join(', ');
      this.logger.log(
        `Sending ${messages.length} persisted messages to ${username}: [${messagePreview}]`,
      );

      // Debug: Show all messages
      this.logger.debug(
        `Full messages for ${username}:`,
        JSON.stringify(messages, null, 2),
      );

      // Group messages by conversation partner
      const conversations = new Map<string, any[]>();

      messages.forEach((msg) => {
        const partner = msg.sender === username ? msg.recipient : msg.sender;
        if (!conversations.has(partner)) {
          conversations.set(partner, []);
        }

        const messageData = {
          sender: msg.sender,
          recipient: msg.recipient,
          message: msg.message,
          timestamp: msg.timestamp.toISOString(),
          isPrivate: msg.isPrivate,
          messageId: msg.id,
        };

        conversations.get(partner)!.push(messageData);

        // Log message content for debugging
        this.logger.log(
          `Message: ${msg.sender} -> ${msg.recipient}: "${msg.message}"`,
        );
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

  @SubscribeMessage('sendInvitation')
  handleSendInvitation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { inviterUsername: string; inviteeEmail: string },
  ): { success: boolean; invitation?: any; message?: string } {
    const sender = this.users.get(client.id);

    if (!sender) {
      return { success: false, message: 'Not registered' };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.inviteeEmail)) {
      return { success: false, message: 'Invalid email format' };
    }

    const invitation = this.invitationService.createInvitation(
      data.inviterUsername,
      data.inviteeEmail,
    );

    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;

    this.logger.log(
      `Invitation sent: ${data.inviterUsername} -> ${data.inviteeEmail}`,
    );

    return {
      success: true,
      invitation: {
        id: invitation.id,
        inviterUsername: invitation.inviterUsername,
        inviteeEmail: invitation.inviteeEmail,
        status: invitation.status,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt,
        invitationLink,
      },
      message: 'Invitation sent successfully',
    };
  }

  @SubscribeMessage('getMyInvitations')
  handleGetMyInvitations(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { username: string },
  ): { success: boolean; invitations?: any[]; message?: string } {
    const user = this.users.get(client.id);

    if (!user) {
      return { success: false, message: 'Not registered' };
    }

    const invitations = this.invitationService.getInvitationsByUser(
      data.username,
    );

    return {
      success: true,
      invitations: invitations.map((inv) => ({
        id: inv.id,
        inviterUsername: inv.inviterUsername,
        inviteeEmail: inv.inviteeEmail,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
      })),
    };
  }

  // Notify a user when someone accepts their invitation
  notifyInvitationAccepted(inviterUsername: string, inviteeEmail: string) {
    // Find the inviter's socket
    const inviterEntry = Array.from(this.users.entries()).find(
      ([_, userData]) => userData.username === inviterUsername,
    );

    if (inviterEntry) {
      const [socketId] = inviterEntry;
      this.server.to(socketId).emit('invitationAccepted', {
        inviteeEmail,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Notified ${inviterUsername} that ${inviteeEmail} accepted invitation`,
      );
    }
  }
}
