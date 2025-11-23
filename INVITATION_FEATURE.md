# Email Invitation Feature

## Overview

The chat application now includes a comprehensive email invitation system that allows users to invite friends to join the platform. The feature includes both backend API endpoints and a real-time WebSocket implementation.

## Features

### Backend

#### Services
- **InvitationService** (`backend/src/database/invitation.service.ts`)
  - Create, retrieve, accept, reject, and delete invitations
  - Track invitation status (pending, accepted, rejected, expired)
  - Automatic expiration after 7 days
  - Statistics and cleanup utilities

#### REST API Endpoints
- **InvitationController** (`backend/src/invitation.controller.ts`)
  - `POST /invitations` - Create a new invitation
  - `GET /invitations/token/:token` - Get invitation by token
  - `POST /invitations/accept/:token` - Accept an invitation
  - `POST /invitations/reject/:token` - Reject an invitation
  - `GET /invitations/user/:username` - Get all invitations sent by a user
  - `GET /invitations/email?email=...` - Get pending invitations for an email
  - `DELETE /invitations/:token` - Delete an invitation
  - `GET /invitations/stats` - Get invitation statistics
  - `POST /invitations/cleanup` - Clean up expired invitations

#### WebSocket Events
- **Gateway Events** (`backend/src/app.gateway.ts`)
  - `sendInvitation` - Send an invitation via WebSocket
  - `getMyInvitations` - Retrieve user's invitations
  - `invitationAccepted` - Real-time notification when someone accepts an invitation

### Frontend

#### Components

1. **InviteFriend** (`frontend/src/components/InviteFriend.tsx`)
   - Dialog for sending invitations
   - Email validation
   - Copy invitation link to clipboard
   - Success/error handling

2. **InvitationsList** (`frontend/src/components/InvitationsList.tsx`)
   - View all sent invitations
   - Status indicators (pending, accepted, rejected, expired)
   - Sortable by date
   - Color-coded status chips

3. **InvitationAccept** (`frontend/src/components/InvitationAccept.tsx`)
   - Standalone page for accepting invitations
   - Accessible via `/invite/:token` route
   - Accept or decline invitation
   - Automatic redirect to chat after acceptance

#### Integration
- Two new buttons in the main app header:
  - **Invite Friend** (PersonAdd icon) - Opens invitation dialog
  - **View Invitations** (List icon) - Opens invitations list
- Real-time notifications when invitations are accepted
- React Router integration for invitation links

## Usage

### Sending an Invitation

1. Click the **Invite Friend** button (person with plus icon) in the header
2. Enter your friend's email address
3. Click "Send Invitation"
4. Copy the generated invitation link and share it with your friend

### Viewing Invitations

1. Click the **View Invitations** button (list icon) in the header
2. See all invitations you've sent with their current status
3. Track which invitations are pending, accepted, rejected, or expired

### Accepting an Invitation

1. Receive an invitation link (e.g., `http://localhost:5173/invite/inv_123456...`)
2. Click the link to open the invitation page
3. Review the invitation details
4. Click "Accept Invitation" to join or "Decline" to reject
5. After accepting, you'll be redirected to the chat application

## API Examples

### Create Invitation (REST)
```bash
curl -X POST http://localhost:3000/invitations \
  -H "Content-Type: application/json" \
  -d '{
    "inviterUsername": "john",
    "inviteeEmail": "friend@example.com"
  }'
```

### Create Invitation (WebSocket)
```javascript
socket.emit('sendInvitation', {
  inviterUsername: 'john',
  inviteeEmail: 'friend@example.com'
}, (response) => {
  console.log(response.invitation.invitationLink);
});
```

### Accept Invitation
```bash
curl -X POST http://localhost:3000/invitations/accept/inv_123456...
```

### Get User's Invitations
```bash
curl http://localhost:3000/invitations/user/john
```

## Data Model

### Invitation Object
```typescript
interface Invitation {
  id: string;                    // Unique identifier
  inviterUsername: string;       // Username of person sending invite
  inviteeEmail: string;          // Email of person being invited
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  token: string;                 // Unique token for invitation link
  createdAt: Date;               // When invitation was created
  expiresAt: Date;               // When invitation expires (7 days)
  acceptedAt?: Date;             // When invitation was accepted (if applicable)
}
```

## Configuration

### Backend
- Invitation expiration: 7 days (configurable in `invitation.service.ts`)
- Frontend URL for links: Set via `FRONTEND_URL` environment variable (defaults to `http://localhost:5173`)

### Frontend
- Backend API URL: `http://localhost:3000` (update in component files if needed)
- Routes configured in `main.tsx`

## Future Enhancements

Potential improvements for the invitation system:

1. **Email Integration**
   - Integrate with email service (SendGrid, AWS SES, etc.)
   - Send automatic invitation emails
   - Email templates with branding

2. **Invitation Limits**
   - Rate limiting for invitation creation
   - Maximum pending invitations per user
   - Cooldown periods

3. **Enhanced Notifications**
   - Toast notifications instead of alerts
   - In-app notification center
   - Push notifications

4. **Analytics**
   - Track invitation conversion rates
   - User acquisition metrics
   - Invitation funnel analysis

5. **Social Features**
   - Share invitations via social media
   - Referral rewards system
   - Invitation leaderboard

## Testing

### Manual Testing

1. **Send Invitation**
   - Log in as a user
   - Click "Invite Friend"
   - Enter an email and send
   - Verify invitation link is generated

2. **View Invitations**
   - Click "View Invitations"
   - Verify all sent invitations are listed
   - Check status indicators are correct

3. **Accept Invitation**
   - Open invitation link in new browser/incognito
   - Verify invitation details are displayed
   - Accept invitation
   - Verify redirect to chat

4. **Real-time Notification**
   - Keep original user logged in
   - Accept invitation in another window
   - Verify notification appears for inviter

### API Testing

Use the provided curl commands or tools like Postman to test the REST endpoints.

## Troubleshooting

### Invitation Link Not Working
- Verify backend is running on correct port
- Check CORS configuration
- Ensure token is valid and not expired

### WebSocket Events Not Firing
- Verify socket connection is established
- Check browser console for errors
- Ensure user is logged in

### Notifications Not Appearing
- Check if inviter is still connected
- Verify WebSocket event listeners are registered
- Check browser console for errors
