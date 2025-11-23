import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Container,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  PersonAdd as InviteIcon,
} from '@mui/icons-material';

interface InvitationData {
  id: string;
  inviterUsername: string;
  inviteeEmail: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function InvitationAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/invitations/token/${token}`,
      );
      const data = await response.json();

      if (data.success && data.invitation) {
        setInvitation(data.invitation);

        // Check if already accepted or expired
        if (data.invitation.status !== 'pending') {
          setError(`This invitation is ${data.invitation.status}`);
        }
      } else {
        setError('Invitation not found');
      }
    } catch (err) {
      setError('Failed to load invitation');
      console.error('Error fetching invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!token) return;

    setAccepting(true);

    try {
      const response = await fetch(
        `http://localhost:3000/invitations/accept/${token}`,
        {
          method: 'POST',
        },
      );
      const data = await response.json();

      if (data.success) {
        setAccepted(true);
        // Redirect to login/chat after 2 seconds
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(data.message || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('An error occurred while accepting the invitation');
      console.error('Error accepting invitation:', err);
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!token) return;

    try {
      const response = await fetch(
        `http://localhost:3000/invitations/reject/${token}`,
        {
          method: 'POST',
        },
      );
      const data = await response.json();

      if (data.success) {
        navigate('/');
      } else {
        setError(data.message || 'Failed to reject invitation');
      }
    } catch (err) {
      setError('An error occurred');
      console.error('Error rejecting invitation:', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="sm">
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        py={4}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {accepted ? (
            <Box textAlign="center">
              <SuccessIcon
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Invitation Accepted!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Redirecting you to the chat...
              </Typography>
            </Box>
          ) : error || !invitation ? (
            <Box textAlign="center">
              <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Invalid Invitation
              </Typography>
              <Typography variant="body1" color="text.secondary" mb={3}>
                {error || 'This invitation link is not valid.'}
              </Typography>
              <Button variant="contained" onClick={() => navigate('/')}>
                Go to Chat
              </Button>
            </Box>
          ) : (
            <Box>
              <Box display="flex" justifyContent="center" mb={3}>
                <InviteIcon sx={{ fontSize: 64, color: 'primary.main' }} />
              </Box>

              <Typography variant="h5" align="center" gutterBottom>
                You're Invited!
              </Typography>

              <Typography
                variant="body1"
                align="center"
                color="text.secondary"
                mb={3}
              >
                <strong>{invitation.inviterUsername}</strong> has invited you to
                join the chat.
              </Typography>

              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Invited to:</strong> {invitation.inviteeEmail}
                </Typography>
                <Typography variant="body2">
                  <strong>Expires:</strong>{' '}
                  {new Date(invitation.expiresAt).toLocaleDateString()}
                </Typography>
              </Alert>

              <Box display="flex" gap={2} justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={handleReject}
                  disabled={accepting}
                >
                  Decline
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAccept}
                  disabled={accepting}
                  startIcon={accepting ? <CircularProgress size={20} /> : null}
                >
                  {accepting ? 'Accepting...' : 'Accept Invitation'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}
