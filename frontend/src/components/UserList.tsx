import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Typography,
    IconButton,
    Divider,
    Badge,
    ListItemButton,
} from '@mui/material';
import {
    Close as CloseIcon,
    Person as PersonIcon,
    Group as GroupIcon,
} from '@mui/icons-material';

export interface User {
    username: string;
    id: string;
    isOnline?: boolean;
}

interface UserListProps {
    open: boolean;
    onClose: () => void;
    users: User[];
    currentUser: string;
    onSelectUser: (user: User) => void;
}

export default function UserList({ open, onClose, users, currentUser, onSelectUser }: UserListProps) {
    return (
        <Drawer
            anchor="right"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: { xs: '85vw', sm: 320 },
                    background: '#fff',
                },
            }}
        >
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GroupIcon />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Online Users
                    </Typography>
                    <Badge
                        badgeContent={users.length}
                        color="secondary"
                        sx={{
                            '& .MuiBadge-badge': {
                                background: 'rgba(255, 255, 255, 0.2)',
                                color: '#fff',
                            },
                        }}
                    />
                </Box>
                <IconButton onClick={onClose} sx={{ color: '#fff' }}>
                    <CloseIcon />
                </IconButton>
            </Box>

            <Divider />

            <List sx={{ p: 0 }}>
                {users.map((user) => {
                    const isMe = user.username === currentUser;
                    return (
                        <ListItem
                            key={user.id}
                            disablePadding
                            sx={{
                                background: isMe ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                            }}
                        >
                            <ListItemButton
                                onClick={() => {
                                    if (!isMe) {
                                        onSelectUser(user);
                                        onClose();
                                    }
                                }}
                                disabled={isMe}
                                sx={{ py: 1.5, px: 2 }}
                            >
                                <ListItemAvatar>
                                    <Avatar
                                        sx={{
                                            background: isMe
                                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                : '#e0e0e0',
                                            color: isMe ? '#fff' : '#757575',
                                        }}
                                    >
                                        <PersonIcon />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Typography
                                            variant="subtitle1"
                                            sx={{
                                                fontWeight: isMe ? 600 : 400,
                                                color: isMe ? '#667eea' : '#000',
                                            }}
                                        >
                                            {user.username} {isMe && '(You)'}
                                        </Typography>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <Box
                                                sx={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: '50%',
                                                    background: '#4caf50',
                                                }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                Online
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}
            </List>
        </Drawer>
    );
}
