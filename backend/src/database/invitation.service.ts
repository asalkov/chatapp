import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class InvitationService {
  private readonly logger = new Logger('InvitationService');
  private invitations: Map<string, Invitation> = new Map(); // token -> invitation
  private userInvitations: Map<string, string[]> = new Map(); // username -> invitation tokens

  // Create a new invitation
  createInvitation(inviterUsername: string, inviteeEmail: string): Invitation {
    // Check if there's already a pending invitation for this email from this user
    const existingInvitation = Array.from(this.invitations.values()).find(
      (inv) =>
        inv.inviterUsername === inviterUsername &&
        inv.inviteeEmail === inviteeEmail &&
        inv.status === 'pending' &&
        inv.expiresAt > new Date(),
    );

    if (existingInvitation) {
      this.logger.log(
        `Returning existing invitation for ${inviteeEmail} from ${inviterUsername}`,
      );
      return existingInvitation;
    }

    const token = this.generateToken();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation: Invitation = {
      id: this.generateId(),
      inviterUsername,
      inviteeEmail,
      status: 'pending',
      token,
      createdAt,
      expiresAt,
    };

    this.invitations.set(token, invitation);

    // Track invitations by user
    const userInvites = this.userInvitations.get(inviterUsername) || [];
    userInvites.push(token);
    this.userInvitations.set(inviterUsername, userInvites);

    this.logger.log(
      `Invitation created: ${inviterUsername} -> ${inviteeEmail} (token: ${token})`,
    );

    return invitation;
  }

  // Get invitation by token
  getInvitationByToken(token: string): Invitation | null {
    const invitation = this.invitations.get(token);

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < new Date() && invitation.status === 'pending') {
      invitation.status = 'expired';
    }

    return invitation;
  }

  // Accept an invitation
  acceptInvitation(token: string): { success: boolean; message: string } {
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

  // Reject an invitation
  rejectInvitation(token: string): { success: boolean; message: string } {
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

  // Get all invitations sent by a user
  getInvitationsByUser(username: string): Invitation[] {
    const tokens = this.userInvitations.get(username) || [];
    return tokens
      .map((token) => this.invitations.get(token))
      .filter((inv): inv is Invitation => inv !== undefined)
      .map((inv) => {
        // Update expired status
        if (inv.expiresAt < new Date() && inv.status === 'pending') {
          inv.status = 'expired';
        }
        return inv;
      });
  }

  // Get pending invitations for an email
  getPendingInvitationsForEmail(email: string): Invitation[] {
    return Array.from(this.invitations.values())
      .filter(
        (inv) =>
          inv.inviteeEmail === email &&
          inv.status === 'pending' &&
          inv.expiresAt > new Date(),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Delete an invitation
  deleteInvitation(token: string): boolean {
    const invitation = this.invitations.get(token);

    if (!invitation) {
      return false;
    }

    this.invitations.delete(token);

    // Remove from user's invitation list
    const userInvites = this.userInvitations.get(invitation.inviterUsername);
    if (userInvites) {
      const filtered = userInvites.filter((t) => t !== token);
      this.userInvitations.set(invitation.inviterUsername, filtered);
    }

    this.logger.log(`Invitation deleted: ${token}`);

    return true;
  }

  // Clean up expired invitations
  cleanupExpiredInvitations(): number {
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

  // Get statistics
  getStats(): {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
  } {
    const stats = {
      total: this.invitations.size,
      pending: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    };

    this.invitations.forEach((invitation) => {
      if (
        invitation.status === 'pending' &&
        invitation.expiresAt > new Date()
      ) {
        stats.pending++;
      } else if (invitation.status === 'accepted') {
        stats.accepted++;
      } else if (invitation.status === 'rejected') {
        stats.rejected++;
      } else {
        stats.expired++;
      }
    });

    return stats;
  }

  private generateToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
