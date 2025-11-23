import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InvitationService } from './database/invitation.service';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  createInvitation(
    @Body() body: { inviterUsername: string; inviteeEmail: string },
  ) {
    const { inviterUsername, inviteeEmail } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteeEmail)) {
      throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
    }

    // Validate username
    if (!inviterUsername || inviterUsername.trim().length < 2) {
      throw new HttpException('Invalid username', HttpStatus.BAD_REQUEST);
    }

    const invitation = this.invitationService.createInvitation(
      inviterUsername,
      inviteeEmail,
    );

    // In a real app, you would send an email here
    // For now, we'll return the invitation link
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

  @Get('token/:token')
  getInvitationByToken(@Param('token') token: string) {
    const invitation = this.invitationService.getInvitationByToken(token);

    if (!invitation) {
      throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
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

  @Post('accept/:token')
  acceptInvitation(@Param('token') token: string) {
    const result = this.invitationService.acceptInvitation(token);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: result.message,
    };
  }

  @Post('reject/:token')
  rejectInvitation(@Param('token') token: string) {
    const result = this.invitationService.rejectInvitation(token);

    if (!result.success) {
      throw new HttpException(result.message, HttpStatus.BAD_REQUEST);
    }

    return {
      success: true,
      message: result.message,
    };
  }

  @Get('user/:username')
  getInvitationsByUser(@Param('username') username: string) {
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

  @Get('email')
  getPendingInvitationsForEmail(@Query('email') email: string) {
    if (!email) {
      throw new HttpException(
        'Email parameter is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const invitations =
      this.invitationService.getPendingInvitationsForEmail(email);

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

  @Delete(':token')
  deleteInvitation(@Param('token') token: string) {
    const success = this.invitationService.deleteInvitation(token);

    if (!success) {
      throw new HttpException('Invitation not found', HttpStatus.NOT_FOUND);
    }

    return {
      success: true,
      message: 'Invitation deleted successfully',
    };
  }

  @Get('stats')
  getStats() {
    const stats = this.invitationService.getStats();

    return {
      success: true,
      stats,
    };
  }

  @Post('cleanup')
  cleanupExpiredInvitations() {
    const count = this.invitationService.cleanupExpiredInvitations();

    return {
      success: true,
      message: `Cleaned up ${count} expired invitations`,
      count,
    };
  }
}
