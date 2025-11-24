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
exports.InvitationController = void 0;
const common_1 = require("@nestjs/common");
const invitation_service_1 = require("./database/invitation.service");
let InvitationController = class InvitationController {
    invitationService;
    constructor(invitationService) {
        this.invitationService = invitationService;
    }
    createInvitation(body) {
        const { inviterUsername, inviteeEmail } = body;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(inviteeEmail)) {
            throw new common_1.HttpException('Invalid email format', common_1.HttpStatus.BAD_REQUEST);
        }
        if (!inviterUsername || inviterUsername.trim().length < 2) {
            throw new common_1.HttpException('Invalid username', common_1.HttpStatus.BAD_REQUEST);
        }
        const invitation = this.invitationService.createInvitation(inviterUsername, inviteeEmail);
        const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${invitation.token}`;
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
            message: 'Invitation created successfully',
        };
    }
    getInvitationByToken(token) {
        const invitation = this.invitationService.getInvitationByToken(token);
        if (!invitation) {
            throw new common_1.HttpException('Invitation not found', common_1.HttpStatus.NOT_FOUND);
        }
        return {
            success: true,
            invitation: {
                id: invitation.id,
                inviterUsername: invitation.inviterUsername,
                inviteeEmail: invitation.inviteeEmail,
                status: invitation.status,
                createdAt: invitation.createdAt,
                expiresAt: invitation.expiresAt,
                acceptedAt: invitation.acceptedAt,
            },
        };
    }
    acceptInvitation(token) {
        const result = this.invitationService.acceptInvitation(token);
        if (!result.success) {
            throw new common_1.HttpException(result.message, common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            success: true,
            message: result.message,
        };
    }
    rejectInvitation(token) {
        const result = this.invitationService.rejectInvitation(token);
        if (!result.success) {
            throw new common_1.HttpException(result.message, common_1.HttpStatus.BAD_REQUEST);
        }
        return {
            success: true,
            message: result.message,
        };
    }
    getInvitationsByUser(username) {
        const invitations = this.invitationService.getInvitationsByUser(username);
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
    getPendingInvitationsForEmail(email) {
        if (!email) {
            throw new common_1.HttpException('Email parameter is required', common_1.HttpStatus.BAD_REQUEST);
        }
        const invitations = this.invitationService.getPendingInvitationsForEmail(email);
        return {
            success: true,
            invitations: invitations.map((inv) => ({
                id: inv.id,
                inviterUsername: inv.inviterUsername,
                status: inv.status,
                createdAt: inv.createdAt,
                expiresAt: inv.expiresAt,
                token: inv.token,
            })),
        };
    }
    deleteInvitation(token) {
        const success = this.invitationService.deleteInvitation(token);
        if (!success) {
            throw new common_1.HttpException('Invitation not found', common_1.HttpStatus.NOT_FOUND);
        }
        return {
            success: true,
            message: 'Invitation deleted successfully',
        };
    }
    getStats() {
        const stats = this.invitationService.getStats();
        return {
            success: true,
            stats,
        };
    }
    cleanupExpiredInvitations() {
        const count = this.invitationService.cleanupExpiredInvitations();
        return {
            success: true,
            message: `Cleaned up ${count} expired invitations`,
            count,
        };
    }
};
exports.InvitationController = InvitationController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "createInvitation", null);
__decorate([
    (0, common_1.Get)('token/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "getInvitationByToken", null);
__decorate([
    (0, common_1.Post)('accept/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "acceptInvitation", null);
__decorate([
    (0, common_1.Post)('reject/:token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "rejectInvitation", null);
__decorate([
    (0, common_1.Get)('user/:username'),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "getInvitationsByUser", null);
__decorate([
    (0, common_1.Get)('email'),
    __param(0, (0, common_1.Query)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "getPendingInvitationsForEmail", null);
__decorate([
    (0, common_1.Delete)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "deleteInvitation", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "getStats", null);
__decorate([
    (0, common_1.Post)('cleanup'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], InvitationController.prototype, "cleanupExpiredInvitations", null);
exports.InvitationController = InvitationController = __decorate([
    (0, common_1.Controller)('invitations'),
    __metadata("design:paramtypes", [invitation_service_1.InvitationService])
], InvitationController);
//# sourceMappingURL=invitation.controller.js.map