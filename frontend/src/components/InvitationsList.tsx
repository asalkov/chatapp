import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  HourglassEmpty as PendingIcon,
  EventBusy as ExpiredIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../store/hooks';

interface InvitationsListProps {
  open: boolean;
  onClose: () => void;
}

interface Invitation {
  id: string;
  inviterUsername: string;
  inviteeEmail: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedAt?: string;
}

export default function InvitationsList({
  open,
  onClose,
}: InvitationsListProps) {
  const { username } = useAppSelector((state) => state.auth);
  const { socket } = useAppSelector((state) => state.socket);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && socket && username) {
      fetchInvitations();
    }
  }, [open, socket, username]);

  const fetchInvitations = () => {
    if (!socket) return;

    setLoading(true);
    setError('');

    socket.emit(
      'getMyInvitations',
      { username },
      (response: { success: boolean; invitations?: Invitation[]; message?: string }) => {
        setLoading(false);

        if (response.success && response.invitations) {
          setInvitations(response.invitations);
        } else {
          setError(response.message || 'Failed to fetch invitations');
        }
      },
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <AcceptedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'pending':
        return <PendingIcon color="warning" />;
      case 'expired':
        return <ExpiredIcon color="disabled" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'default';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const sortedInvitations = [...invitations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">My Invitations</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : invitations.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography variant="body1" color="text.secondary">
              You haven't sent any invitations yet.
            </Typography>
          </Box>
        ) : (
          <List>
            {sortedInvitations.map((invitation, index) => (
              <Box key={invitation.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 2,
                  }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                    mb={1}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      {getStatusIcon(invitation.status)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {invitation.inviteeEmail}
                      </Typography>
                    </Box>
                    <Chip
                      label={invitation.status.toUpperCase()}
                      color={getStatusColor(invitation.status) as any}
                      size="small"
                    />
                  </Box>

                  <ListItemText
                    secondary={
                      <Box component="span">
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.secondary"
                          display="block"
                        >
                          Sent: {formatDate(invitation.createdAt)}
                        </Typography>
                        {invitation.status === 'pending' && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.secondary"
                            display="block"
                          >
                            Expires: {formatDate(invitation.expiresAt)}
                          </Typography>
                        )}
                        {invitation.acceptedAt && (
                          <Typography
                            component="span"
                            variant="body2"
                            color="success.main"
                            display="block"
                          >
                            Accepted: {formatDate(invitation.acceptedAt)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
