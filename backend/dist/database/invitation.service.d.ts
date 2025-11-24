export interface Invitation {
    id: string;
    inviterUsername: string;
    inviteeEmail: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    token: string;
    createdAt: Date;
    expiresAt: Date;
    acceptedAt?: Date;
}
export declare class InvitationService {
    private readonly logger;
    private invitations;
    private userInvitations;
    createInvitation(inviterUsername: string, inviteeEmail: string): Invitation;
    getInvitationByToken(token: string): Invitation | null;
    acceptInvitation(token: string): {
        success: boolean;
        message: string;
    };
    rejectInvitation(token: string): {
        success: boolean;
        message: string;
    };
    getInvitationsByUser(username: string): Invitation[];
    getPendingInvitationsForEmail(email: string): Invitation[];
    deleteInvitation(token: string): boolean;
    cleanupExpiredInvitations(): number;
    getStats(): {
        total: number;
        pending: number;
        accepted: number;
        rejected: number;
        expired: number;
    };
    private generateToken;
    private generateId;
}
