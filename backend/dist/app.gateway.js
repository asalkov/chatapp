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
let AppGateway = class AppGateway {
    messageService;
    server;
    logger = new common_1.Logger('AppGateway');
    users = new Map();
    constructor(messageService) {
        this.messageService = messageService;
    }
    handleRegister(client, data) {
        const username = data.username.trim();
        if (!username || username.length < 2) {
            return {
                success: false,
                message: 'Username must be at least 2 characters',
            };
        }
        const existingUser = Array.from(this.users.values()).find((u) => u.username.toLowerCase() === username.toLowerCase());
        if (existingUser) {
            return { success: false, message: 'Username already taken' };
        }
        this.users.set(client.id, {
            username,
            connectedAt: new Date(),
        });
        this.logger.log(`User registered: ${username} (${client.id})`);
        this.logger.log(`Notifying everyone that user joined: ${username}`);
        this.server.emit('userJoined', { username, userCount: this.users.size });
        this.broadcastUserList();
        this.sendPersistedMessages(client, username);
        return { success: true };
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
    handleAdminRemoveUser(client, data) {
        const admin = this.users.get(client.id);
        if (!admin) {
            return { success: false, message: 'Not authenticated' };
        }
        if (admin.username.toLowerCase() !== 'admin') {
            this.logger.warn(`Unauthorized remove attempt by ${admin.username}`);
            return { success: false, message: 'Unauthorized: Admin privileges required' };
        }
        const usernameToRemove = data.username;
        const userEntry = Array.from(this.users.entries()).find(([_, userData]) => userData.username === usernameToRemove);
        if (!userEntry) {
            return { success: false, message: 'User not found' };
        }
        const [socketId, userData] = userEntry;
        this.users.delete(socketId);
        this.logger.log(`Admin ${admin.username} removed user: ${usernameToRemove} (${socketId})`);
        const targetSocket = this.server.sockets.sockets.get(socketId);
        if (targetSocket) {
            targetSocket.emit('removedByAdmin', {
                message: 'You have been removed by an administrator'
            });
            targetSocket.disconnect(true);
        }
        this.server.emit('userRemoved', {
            username: usernameToRemove,
            removedBy: 'admin'
        });
        this.broadcastUserList();
        this.messageService.deleteUserMessages(usernameToRemove);
        return { success: true, message: `User ${usernameToRemove} removed successfully` };
    }
    sendPersistedMessages(client, username) {
        const messages = this.messageService.getMessagesForUser(username);
        if (messages.length > 0) {
            this.logger.log(`Sending ${messages.length} persisted messages to ${username}`);
            const conversations = new Map();
            messages.forEach((msg) => {
                const partner = msg.sender === username ? msg.recipient : msg.sender;
                if (!conversations.has(partner)) {
                    conversations.set(partner, []);
                }
                conversations.get(partner).push({
                    sender: msg.sender,
                    recipient: msg.recipient,
                    message: msg.message,
                    timestamp: msg.timestamp.toISOString(),
                    isPrivate: msg.isPrivate,
                    messageId: msg.id,
                });
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
};
exports.AppGateway = AppGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], AppGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('register'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleRegister", null);
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
    (0, websockets_1.SubscribeMessage)('adminRemoveUser'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Object)
], AppGateway.prototype, "handleAdminRemoveUser", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [message_service_1.MessageService])
], AppGateway);
//# sourceMappingURL=app.gateway.js.map