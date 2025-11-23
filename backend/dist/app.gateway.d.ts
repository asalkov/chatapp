import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageService } from './database/message.service';
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly messageService;
    server: Server;
    private logger;
    private users;
    constructor(messageService: MessageService);
    handleRegister(client: Socket, data: {
        username: string;
    }): {
        success: boolean;
        message?: string;
    };
    private broadcastUserList;
    handlePrivateMessage(client: Socket, data: {
        to: string;
        message: string;
    }): void;
    handleMessage(client: Socket, data: {
        message: string;
    }): void;
    handleAdminRemoveUser(client: Socket, data: {
        username: string;
        adminUsername: string;
    }): {
        success: boolean;
        message?: string;
    };
    private sendPersistedMessages;
    afterInit(server: Server): void;
    handleDisconnect(client: Socket): void;
    handleConnection(client: Socket): void;
}
