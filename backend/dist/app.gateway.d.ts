import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { MessageService } from './database/message.service';
import { InvitationService } from './database/invitation.service';
import { UserService } from './database/user.service';
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly messageService;
    private readonly invitationService;
    private readonly userService;
    server: Server;
    private logger;
    private users;
    constructor(messageService: MessageService, invitationService: InvitationService, userService: UserService);
    handleRegisterUser(client: Socket, data: {
        username: string;
        email: string;
        password: string;
    }): Promise<{
        success: boolean;
        message?: string;
    }>;
    handleLoginUser(client: Socket, data: {
        username: string;
        password: string;
    }): Promise<{
        success: boolean;
        message?: string;
    }>;
    private connectUserSession;
    private broadcastUserList;
    handlePrivateMessage(client: Socket, data: {
        to: string;
        message: string;
    }): void;
    handleMessage(client: Socket, data: {
        message: string;
    }): void;
    handleAdminGetAllChats(client: Socket): {
        success: boolean;
        chats?: any;
        message?: string;
    };
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
    handleSendInvitation(client: Socket, data: {
        inviterUsername: string;
        inviteeEmail: string;
    }): {
        success: boolean;
        invitation?: any;
        message?: string;
    };
    handleGetMyInvitations(client: Socket, data: {
        username: string;
    }): {
        success: boolean;
        invitations?: any[];
        message?: string;
    };
    notifyInvitationAccepted(inviterUsername: string, inviteeEmail: string): void;
}
