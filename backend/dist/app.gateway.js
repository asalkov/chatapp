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
let AppGateway = class AppGateway {
    server;
    logger = new common_1.Logger('AppGateway');
    users = new Map();
    handleRegister(client, data) {
        const username = data.username.trim();
        if (!username || username.length < 2) {
            return { success: false, message: 'Username must be at least 2 characters' };
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
        this.server.emit('userJoined', { username, userCount: this.users.size });
        return { success: true };
    }
    handleMessage(client, data) {
        const user = this.users.get(client.id);
        if (!user) {
            client.emit('error', { message: 'Not registered. Please login first.' });
            return;
        }
        this.server.emit('msgToClient', {
            sender: user.username,
            message: data.message,
        });
    }
    afterInit(server) {
        this.logger.log('WebSocket Gateway initialized');
    }
    handleDisconnect(client) {
        const user = this.users.get(client.id);
        if (user) {
            this.logger.log(`User disconnected: ${user.username} (${client.id})`);
            this.users.delete(client.id);
            this.server.emit('userLeft', { username: user.username, userCount: this.users.size });
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
    (0, websockets_1.SubscribeMessage)('msgToServer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handleMessage", null);
exports.AppGateway = AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    })
], AppGateway);
//# sourceMappingURL=app.gateway.js.map