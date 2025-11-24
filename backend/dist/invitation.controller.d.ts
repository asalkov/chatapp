import { InvitationService } from './database/invitation.service';
export declare class InvitationController {
    private readonly invitationService;
    constructor(invitationService: InvitationService);
    createInvitation(body: {
        inviterUsername: string;
        inviteeEmail: string;
    }): {
        success: boolean;
        invitation: {
            id: string;
            inviterUsername: string;
            inviteeEmail: string;
            status: "pending" | "accepted" | "rejected" | "expired";
            createdAt: Date;
            expiresAt: Date;
            invitationLink: string;
        };
        message: string;
    };
    getInvitationByToken(token: string): {
        success: boolean;
        invitation: {
            id: string;
            inviterUsername: string;
            inviteeEmail: string;
            status: "pending" | "accepted" | "rejected" | "expired";
            createdAt: Date;
            expiresAt: Date;
            acceptedAt: Date | undefined;
        };
    };
    acceptInvitation(token: string): {
        success: boolean;
        message: string;
    };
    rejectInvitation(token: string): {
        success: boolean;
        message: string;
    };
    getInvitationsByUser(username: string): {
        success: boolean;
        invitations: {
            id: string;
            inviterUsername: string;
            inviteeEmail: string;
            status: "pending" | "accepted" | "rejected" | "expired";
            createdAt: Date;
            expiresAt: Date;
            acceptedAt: Date | undefined;
        }[];
    };
    getPendingInvitationsForEmail(email: string): {
        success: boolean;
        invitations: {
            id: string;
            inviterUsername: string;
            status: "pending" | "accepted" | "rejected" | "expired";
            createdAt: Date;
            expiresAt: Date;
            token: string;
        }[];
    };
    deleteInvitation(token: string): {
        success: boolean;
        message: string;
    };
    getStats(): {
        success: boolean;
        stats: {
            total: number;
            pending: number;
            accepted: number;
            rejected: number;
            expired: number;
        };
    };
    cleanupExpiredInvitations(): {
        success: boolean;
        message: string;
        count: number;
    };
}
