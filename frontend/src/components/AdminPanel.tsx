import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Paper,
    Divider,
    Chip,
} from '@mui/material';
import {
    Delete as DeleteIcon,
    Person as PersonIcon,
    Chat as ChatIcon,
} from '@mui/icons-material';
import type { User } from './UserList';

interface AdminPanelProps {
    users: User[];
    chats: Record<string, any[]>;
    onDeleteUser: (username: string) => void;
    onDeleteChat: (chatId: string) => void;
}

export default function AdminPanel({ users, chats, onDeleteUser, onDeleteChat }: AdminPanelProps) {
    const chatEntries = Object.entries(chats);
    
    // Calculate total messages across all chats
    const totalMessages = chatEntries.reduce((sum, [_, messages]) => sum + messages.length, 0);

    return (
        <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#667eea' }}>
                Admin Panel
            </Typography>

            {/* Users Section */}
            <Paper elevation={2} sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ mr: 1, color: '#667eea' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Users ({users.length})
                    </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {users.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No users found
                    </Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {users.map((user) => (
                            <ListItem
                                key={user.username}
                                sx={{
                                    borderBottom: '1px solid #f0f0f0',
                                    '&:last-child': { borderBottom: 'none' },
                                }}
                                secondaryAction={
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        onClick={() => {
                                            if (window.confirm(`Are you sure you want to remove user "${user.username}"?`)) {
                                                onDeleteUser(user.username);
                                            }
                                        }}
                                        sx={{
                                            color: '#f44336',
                                            '&:hover': { background: 'rgba(244, 67, 54, 0.1)' }
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                                {user.username}
                                            </Typography>
                                            <Chip
                                                label={user.isOnline ? 'Online' : 'Offline'}
                                                size="small"
                                                sx={{
                                                    background: user.isOnline ? '#4caf50' : '#9e9e9e',
                                                    color: '#fff',
                                                    fontSize: '0.7rem',
                                                    height: 20,
                                                }}
                                            />
                                        </Box>
                                    }
                                    secondary={`ID: ${user.id || 'N/A'}`}
                                />
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            {/* Chats Section */}
            <Paper elevation={2} sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ChatIcon sx={{ mr: 1, color: '#667eea' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        All User Chats ({chatEntries.length} users, {totalMessages} messages)
                    </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {chatEntries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No chats found
                    </Typography>
                ) : (
                    <List sx={{ p: 0 }}>
                        {chatEntries.map(([username, messages]) => {
                            // Get unique conversation partners for this user
                            const partners = new Set<string>();
                            messages.forEach((msg: any) => {
                                if (msg.sender === username) {
                                    partners.add(msg.recipient);
                                } else {
                                    partners.add(msg.sender);
                                }
                            });
                            
                            return (
                                <ListItem
                                    key={username}
                                    sx={{
                                        borderBottom: '1px solid #f0f0f0',
                                        '&:last-child': { borderBottom: 'none' },
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <ListItemText
                                            primary={
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {username}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {messages.length} message{messages.length !== 1 ? 's' : ''} • {partners.size} conversation{partners.size !== 1 ? 's' : ''}
                                                    </Typography>
                                                    {partners.size > 0 && (
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                                            Chatting with: {Array.from(partners).join(', ')}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                        <IconButton
                                            edge="end"
                                            aria-label="delete"
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete all chats for "${username}"?`)) {
                                                    onDeleteChat(username);
                                                }
                                            }}
                                            sx={{
                                                color: '#f44336',
                                                '&:hover': { background: 'rgba(244, 67, 54, 0.1)' }
                                            }}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Paper>

            {/* Info Box */}
            <Paper
                elevation={0}
                sx={{
                    mt: 3,
                    p: 2,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    <strong>Admin Privileges:</strong>
                    <br />
                    • Remove users from the system
                    <br />
                    • Delete chat conversations
                    <br />
                    • View all users and chats
                    <br />
                    • You are invisible to other users
                    <br />
                    • You cannot send messages
                </Typography>
            </Paper>
        </Box>
    );
}
