import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Snackbar,
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';

interface InviteFriendProps {
  open: boolean;
  onClose: () => void;
}

interface InvitationResponse {
  success: boolean;
  invitation?: {
    id: string;
    inviterUsername: string;
    inviteeEmail: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    invitationLink: string;
  };
  message?: string;
}

export default function InviteFriend({ open, onClose }: InviteFriendProps) {
  const { username } = useAppSelector((state) => state.auth);
  const { socket } = useAppSelector((state) => state.socket);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvitation = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setLoading(true);
    setError('');

    try {
      socket.emit(
        'sendInvitation',
        {
          inviterUsername: username,
          inviteeEmail: email,
        },
        (response: InvitationResponse) => {
          setLoading(false);

          if (response.success && response.invitation) {
            setInvitationLink(response.invitation.invitationLink);
            setEmail('');
          } else {
            setError(response.message || 'Failed to send invitation');
          }
        },
      );
    } catch (err) {
      setLoading(false);
      setError('An error occurred while sending the invitation');
      console.error('Invitation error:', err);
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setShowCopySuccess(true);
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    setInvitationLink('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon color="primary" />
              <Typography variant="h6">Invite a Friend</Typography>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          {!invitationLink ? (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enter your friend's email address to send them an invitation to
                join the chat.
              </Typography>

              <TextField
                fullWidth
                label="Friend's Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleSendInvitation();
                  }
                }}
                disabled={loading}
                error={!!error}
                helperText={error}
                placeholder="friend@example.com"
                autoFocus
                sx={{ mb: 2 }}
              />

              {loading && (
                <Box display="flex" justifyContent="center" my={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                Invitation created successfully!
              </Alert>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Share this link with your friend:
              </Typography>

              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {invitationLink}
                </Typography>
                <IconButton
                  onClick={handleCopyLink}
                  color="primary"
                  size="small"
                >
                  <CopyIcon />
                </IconButton>
              </Box>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 2, display: 'block' }}
              >
                This invitation link will expire in 7 days.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {!invitationLink ? (
            <>
              <Button onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitation}
                variant="contained"
                disabled={loading || !email.trim()}
              >
                Send Invitation
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} variant="contained">
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showCopySuccess}
        autoHideDuration={2000}
        onClose={() => setShowCopySuccess(false)}
        message="Link copied to clipboard!"
      />
    </>
  );
}
