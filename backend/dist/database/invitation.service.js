"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitationService = void 0;
const common_1 = require("@nestjs/common");
let InvitationService = class InvitationService {
    logger = new common_1.Logger('InvitationService');
    invitations = new Map();
    userInvitations = new Map();
    createInvitation(inviterUsername, inviteeEmail) {
        const existingInvitation = Array.from(this.invitations.values()).find((inv) => inv.inviterUsername === inviterUsername &&
            inv.inviteeEmail === inviteeEmail &&
            inv.status === 'pending' &&
            inv.expiresAt > new Date());
        if (existingInvitation) {
            this.logger.log(`Returning existing invitation for ${inviteeEmail} from ${inviterUsername}`);
            return existingInvitation;
        }
        const token = this.generateToken();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        const invitation = {
            id: this.generateId(),
            inviterUsername,
            inviteeEmail,
            status: 'pending',
            token,
            createdAt,
            expiresAt,
        };
        this.invitations.set(token, invitation);
        const userInvites = this.userInvitations.get(inviterUsername) || [];
        userInvites.push(token);
        this.userInvitations.set(inviterUsername, userInvites);
        this.logger.log(`Invitation created: ${inviterUsername} -> ${inviteeEmail} (token: ${token})`);
        return invitation;
    }
    getInvitationByToken(token) {
        const invitation = this.invitations.get(token);
        if (!invitation) {
            return null;
        }
        if (invitation.expiresAt < new Date() && invitation.status === 'pending') {
            invitation.status = 'expired';
        }
        return invitation;
    }
    acceptInvitation(token) {
        const invitation = this.invitations.get(token);
        if (!invitation) {
            return { success: false, message: 'Invitation not found' };
        }
        if (invitation.status !== 'pending') {
            return {
                success: false,
                message: `Invitation is ${invitation.status}`,
            };
        }
        if (invitation.expiresAt < new Date()) {
            invitation.status = 'expired';
            return { success: false, message: 'Invitation has expired' };
        }
        invitation.status = 'accepted';
        invitation.acceptedAt = new Date();
        this.logger.log(`Invitation accepted: ${token}`);
        return { success: true, message: 'Invitation accepted' };
    }
    rejectInvitation(token) {
        const invitation = this.invitations.get(token);
        if (!invitation) {
            return { success: false, message: 'Invitation not found' };
        }
        if (invitation.status !== 'pending') {
            return {
                success: false,
                message: `Invitation is already ${invitation.status}`,
            };
        }
        invitation.status = 'rejected';
        this.logger.log(`Invitation rejected: ${token}`);
        return { success: true, message: 'Invitation rejected' };
    }
    getInvitationsByUser(username) {
        const tokens = this.userInvitations.get(username) || [];
        return tokens
            .map((token) => this.invitations.get(token))
            .filter((inv) => inv !== undefined)
            .map((inv) => {
            if (inv.expiresAt < new Date() && inv.status === 'pending') {
                inv.status = 'expired';
            }
            return inv;
        });
    }
    getPendingInvitationsForEmail(email) {
        return Array.from(this.invitations.values())
            .filter((inv) => inv.inviteeEmail === email &&
            inv.status === 'pending' &&
            inv.expiresAt > new Date())
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    deleteInvitation(token) {
        const invitation = this.invitations.get(token);
        if (!invitation) {
            return false;
        }
        this.invitations.delete(token);
        const userInvites = this.userInvitations.get(invitation.inviterUsername);
        if (userInvites) {
            const filtered = userInvites.filter((t) => t !== token);
            this.userInvitations.set(invitation.inviterUsername, filtered);
        }
        this.logger.log(`Invitation deleted: ${token}`);
        return true;
    }
    cleanupExpiredInvitations() {
        const now = new Date();
        let count = 0;
        this.invitations.forEach((invitation, token) => {
            if (invitation.expiresAt < now && invitation.status === 'pending') {
                invitation.status = 'expired';
                count++;
            }
        });
        this.logger.log(`Cleaned up ${count} expired invitations`);
        return count;
    }
    getStats() {
        const stats = {
            total: this.invitations.size,
            pending: 0,
            accepted: 0,
            rejected: 0,
            expired: 0,
        };
        this.invitations.forEach((invitation) => {
            if (invitation.status === 'pending' &&
                invitation.expiresAt > new Date()) {
                stats.pending++;
            }
            else if (invitation.status === 'accepted') {
                stats.accepted++;
            }
            else if (invitation.status === 'rejected') {
                stats.rejected++;
            }
            else {
                stats.expired++;
            }
        });
        return stats;
    }
    generateToken() {
        return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};
exports.InvitationService = InvitationService;
exports.InvitationService = InvitationService = __decorate([
    (0, common_1.Injectable)()
], InvitationService);
//# sourceMappingURL=invitation.service.js.map