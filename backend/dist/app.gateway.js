"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const message_service_1 = require("./database/message.service");
const invitation_service_1 = require("./database/invitation.service");
const user_service_1 = require("./database/user.service");
let AppGateway = class AppGateway {
    messageService;
    invitationService;
    userService;
    server;
    logger = new common_1.Logger('AppGateway');
    users = new Map();
    constructor(messageService, invitationService, userService) {
        this.messageService = messageService;
        this.invitationService = invitationService;
        this.userService = userService;
    }
    async handleRegisterUser(client, data) {
        const username = data.username?.trim();
        const email = data.email?.trim();
        const password = data.password;
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
            await this.userService.createUser({ username, email, password });
            this.connectUserSession(client, username);
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Registration failed: ${error.message}`);
            return {
                success: false,
                message: error.message || 'Registration failed',
            };
        }
    }
    async handleLoginUser(client, data) {
        const username = data.username?.trim();
        const password = data.password;
        if (!username || !password) {
            return {
                success: false,
                message: 'Username and password are required',
            };
        }
        const user = this.userService.findByUsername(username);
        if (!user) {
            return {
                success: false,
                message: 'Invalid username or password',
            };
        }
        const isPasswordValid = await this.userService.validatePassword(password, user.password);
        if (!isPasswordValid) {
            return {
                success: false,
                message: 'Invalid username or password',
            };
        }
        this.userService.updateLastLogin(user.id);
        this.connectUserSession(client, username);
        return { success: true };
    }
    connectUserSession(client, username) {
        const existingEntry = Array.from(this.users.entries()).find(([socketId, u]) => u.username.toLowerCase() === username.toLowerCase());
        if (existingEntry) {
            const [existingSocketId] = existingEntry;
            if (existingSocketId === client.id) {
                this.logger.log(`User ${username} reconnecting with same socket ID`);
            }
            else {
                this.logger.log(`User ${username} connecting from new session, disconnecting old session`);
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
        this.users.set(client.id, {
            username,
            connectedAt: new Date(),
        });
        this.logger.log(`User connected: ${username} (${client.id})`);
        this.server.emit('userJoined', { username, userCount: this.users.size });
        this.broadcastUserList();
        this.sendPersistedMessages(client, username);
    }
    broadcastUserList() {
        const userList = Array.from(this.users.entries()).map(([id, u]) => ({
            username: u.username,
            id,
        }));
        this.logger.log(`Broadcasting user list: ${JSON.stringify(userList)}`);
        this.server.emit('userList', userList);
    }
    handlePrivateMessage(client, data) {
        this.logger.log(`Private message: ${data.message} to ${data.to} from ${client.id}`);
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
        this.server.to(recipientSocketId).emit('msgToClient', payload);
        client.emit('msgToClient', {
            ...payload,
            toId: recipientSocketId,
            recipient: recipient.username,
        });
        this.logger.log(`Message saved and sent: ${sender.username} -> ${recipient.username}`);
    }
    handleMessage(client, data) {
        const user = this.users.get(client.id);
        if (!user) {
            client.emit('error', { message: 'Not registered. Please login first.' });
            return;
        }
        this.logger.log(`Sending message from ${user.username}: ${data.message}`);
        this.server.emit('msgToClient', {
            sender: user.username,
            message: data.message,
        });
    }
    handleAdminGetAllChats(client) {
        const admin = this.users.get(client.id);
        if (!admin) {
            return { success: false, message: 'Not authenticated' };
        }
        if (admin.username.toLowerCase() !== 'admin') {
            this.logger.warn(`Unauthorized getAllChats attempt by ${admin.username}`);
            return {
                success: false,
                message: 'Unauthorized: Admin privileges required',
            };
        }
        const allMessages = this.messageService.getAllMessages();
        const chatsObject = {};
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
    handleAdminRemoveUser(client, data) {
        const admin = this.users.get(client.id);
        if (!admin) {
            return { success: false, message: 'Not authenticated' };
        }
        if (admin.username.toLowerCase() !== 'admin') {
            this.logger.warn(`Unauthorized remove attempt by ${admin.username}`);
            return {
                success: false,
                message: 'Unauthorized: Admin privileges required',
            };
        }
        const usernameToRemove = data.username;
        const userEntry = Array.from(this.users.entries()).find(([, userData]) => userData.username === usernameToRemove);
        if (!userEntry) {
            return { success: false, message: 'User not found' };
        }
        const [socketId] = userEntry;
        this.users.delete(socketId);
        this.logger.log(`Admin ${admin.username} removed user: ${usernameToRemove} (${socketId})`);
        const targetSocket = this.server.sockets.sockets.get(socketId);
        if (targetSocket) {
            targetSocket.emit('removedByAdmin', {
                message: 'You have been removed by an administrator',
            });
            targetSocket.disconnect(true);
        }
        this.server.emit('userRemoved', {
            username: usernameToRemove,
            removedBy: 'admin',
        });
        this.broadcastUserList();
        this.messageService.deleteUserMessages(usernameToRemove);
        return {
            success: true,
            message: `User ${usernameToRemove} removed successfully`,
        };
    }
    sendPersistedMessages(client, username) {
        const messages = this.messageService.getMessagesForUser(username);
        if (messages.length > 0) {
            const messagePreview = messages.map(m => `${m.sender}->${m.recipient}: "${m.message}"`).join(', ');
            this.logger.log(`Sending ${messages.length} persisted messages to ${username}: [${messagePreview}]`);
            this.logger.debug(`Full messages for ${username}:`, JSON.stringify(messages, null, 2));
            const conversations = new Map();
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
                conversations.get(partner).push(messageData);
                this.logger.log(`Message: ${msg.sender} -> ${msg.recipient}: "${msg.message}"`);
            });
            client.emit('persistedMessages', {
                conversations: Object.fromEntries(conversations),
                totalMessages: messages.length,
            });
        }
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleDisconnect(client) {
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
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleSendInvitation(client, data) {
        const sender = this.users.get(client.id);
        if (!sender) {
            return { success: false, message: 'Not registered' };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.inviteeEmail)) {
            return { success: false, message: 'Invalid email format' };
        }
        const invitation = this.invitationService.createInvitation(data.inviterUsername, data.inviteeEmail);
        const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
        this.logger.log(`Invitation sent: ${data.inviterUsername} -> ${data.inviteeEmail}`);
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
    handleGetMyInvitations(client, data) {
        const user = this.users.get(client.id);
        if (!user) {
            return { success: false, message: 'Not registered' };
        }
        const invitations = this.invitationService.getInvitationsByUser(data.username);
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
    notifyInvitationAccepted(inviterUsername, inviteeEmail) {
        const inviterEntry = Array.from(this.users.entries()).find(([_, userData]) => userData.username === inviterUsername);
        if (inviterEntry) {
            const [socketId] = inviterEntry;
            this.server.to(socketId).emit('invitationAccepted', {
                inviteeEmail,
                timestamp: new Date().toISOString(),
            });
            this.logger.log(`Notified ${inviterUsername} that ${inviteeEmail} accepted invitation`);
        }
    }
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('registerUser'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleRegisterUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('loginUser'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], AppGateway.prototype, "handleLoginUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('privateMessage'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handlePrivateMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('msgToServer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('adminGetAllChats'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleAdminGetAllChats", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('adminRemoveUser'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleAdminRemoveUser", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendInvitation'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleSendInvitation", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getMyInvitations'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleGetMyInvitations", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [message_service_1.MessageService,
        invitation_service_1.InvitationService,
        user_service_1.UserService])
], AppGateway);
//# sourceMappingURL=app.gateway.js.map