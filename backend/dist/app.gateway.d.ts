import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    server: Server;
    private logger;
    private users;
    handleRegister(client: Socket, data: {
        username: string;
    }): {
        success: boolean;
        message?: string;
    };
    handleMessage(client: Socket, data: {
        message: string;
    }): void;
    afterInit(server: Server): void;
    handleDisconnect(client: Socket): void;
    handleConnection(client: Socket): void;
}
