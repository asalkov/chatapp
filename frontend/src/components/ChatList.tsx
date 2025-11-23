import { useState } from 'react';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemAvatar,
    ListItemText,
    Avatar,
    Typography,
    IconButton,
    TextField,
    InputAdornment,
} from '@mui/material';
import {
    Search as SearchIcon,
    MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import type { User } from './UserList';

interface ChatListProps {
    open: boolean;
    onClose: () => void;
    activeChat: string | null;
    chats: Record<string, any[]>; // Record of chat ID -> messages
    onSelectChat: (chatId: string | null) => void;
    unreadCounts: Record<string, number>;
    onlineUsers: User[];
    currentUsername: string; // Current logged-in user
    variant?: 'permanent' | 'persistent' | 'temporary';
}

export default function ChatList({
    open,
    onClose,
    activeChat,
    chats,
    onSelectChat,
    unreadCounts,
    onlineUsers,
    currentUsername,
    variant = 'temporary',
}: ChatListProps) {
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Get all unique users from both onlineUsers and chat history (excluding current user)
    const allUsernames = new Set<string>();
    onlineUsers.forEach(u => {
        if (u.username !== currentUsername) {
            allUsernames.add(u.username);
        }
    });
    Object.keys(chats).forEach(k => {
        if (k !== 'Global Chat' && k !== currentUsername) {
            allUsernames.add(k);
        }
    });

    // 2. Create a unified list of user objects
    const displayList = Array.from(allUsernames).map(username => {
        const user = onlineUsers.find(u => u.username === username);
        const isOnline = user?.isOnline ?? false;
        const messages = chats[username] || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const unread = unreadCounts[username] || 0;

        return {
            username,
            isOnline,
            lastMessage,
            unread,
            timestamp: lastMessage?.timestamp ? new Date(lastMessage.timestamp).getTime() : 0
        };
    });

    // 3. Sort: Most recent message first, then online users, then alphabetical
    displayList.sort((a, b) => {
        if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return a.username.localeCompare(b.username);
    });

    // 4. Filter by search
    const filteredList = displayList.filter(item =>
        item.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

        if (isToday) {
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            variant={variant}
            PaperProps={{
                sx: {
                    width: 320,
                    background: '#fff',
                    borderRight: '1px solid rgba(0,0,0,0.12)',
                    position: variant === 'permanent' ? 'relative' : 'fixed',
                    height: '100%',
                },
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    p: 2.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
            >
                <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
                    Messages
                </Typography>
                <Box>
                    <IconButton onClick={onClose} sx={{ color: '#fff', display: variant === 'permanent' ? 'none' : 'inline-flex' }}>
                        <MoreVertIcon />
                    </IconButton>
                </Box>
            </Box>

            {/* Search Bar */}
            <Box sx={{ p: 2, pb: 1.5, background: '#fafafa' }}>
                <TextField
                    fullWidth
                    placeholder="Search messages"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: '#999', fontSize: 20 }} />
                            </InputAdornment>
                        ),
                        sx: {
                            borderRadius: 3,
                            background: '#fff',
                            border: '1px solid #e0e0e0',
                            '& fieldset': { border: 'none' },
                            '&:hover': {
                                background: '#fff',
                                borderColor: '#ccc',
                            },
                            '&.Mui-focused': {
                                background: '#fff',
                                borderColor: '#667eea',
                            }
                        }
                    }}
                />
            </Box>

            <List sx={{ p: 0, background: '#fff' }}>
                {filteredList.map((item) => {
                    return (
                        <ListItem key={item.username} disablePadding>
                            <ListItemButton
                                onClick={() => {
                                    onSelectChat(item.username);
                                    if (variant !== 'permanent') {
                                        onClose();
                                    }
                                }}
                                sx={{
                                    py: 2,
                                    px: 2.5,
                                    borderBottom: '1px solid #f0f0f0',
                                    background: activeChat === item.username ? '#f5f3ff' : 'transparent',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: activeChat === item.username ? '#f5f3ff' : '#fafafa',
                                    },
                                }}
                            >
                                <ListItemAvatar>
                                    <Box sx={{ position: 'relative', mr: 1 }}>
                                        <Avatar
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.username}`}
                                            alt={item.username}
                                            sx={{ 
                                                width: 56, 
                                                height: 56,
                                                border: '2px solid #f0f0f0',
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                right: 0,
                                                width: 14,
                                                height: 14,
                                                borderRadius: '50%',
                                                background: item.isOnline ? '#4caf50' : '#9e9e9e',
                                                border: '3px solid #fff',
                                                boxShadow: item.isOnline 
                                                    ? '0 0 0 1px rgba(76, 175, 80, 0.3)'
                                                    : '0 0 0 1px rgba(158, 158, 158, 0.3)',
                                            }}
                                        />
                                    </Box>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                            <Typography 
                                                variant="subtitle1" 
                                                sx={{ 
                                                    fontWeight: 600,
                                                    fontSize: '1rem',
                                                    color: '#1a1a1a',
                                                }}
                                            >
                                                {item.username}
                                            </Typography>
                                            <Typography 
                                                variant="caption" 
                                                sx={{ 
                                                    color: '#999',
                                                    fontSize: '0.75rem',
                                                    whiteSpace: 'nowrap',
                                                    ml: 1,
                                                }}
                                            >
                                                {formatTimestamp(item.lastMessage?.timestamp)}
                                            </Typography>
                                        </Box>
                                    }
                                    secondary={
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.25 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '170px',
                                                    color: item.unread > 0 ? '#333' : '#666',
                                                    fontWeight: item.unread > 0 ? 500 : 400,
                                                    fontSize: '0.875rem',
                                                }}
                                            >
                                                {item.lastMessage ? item.lastMessage.message : 'Start a conversation'}
                                            </Typography>
                                            {item.unread > 0 && (
                                                <Box
                                                    sx={{
                                                        minWidth: 24,
                                                        height: 24,
                                                        borderRadius: '50%',
                                                        background: '#667eea',
                                                        color: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        ml: 1,
                                                    }}
                                                >
                                                    {item.unread > 9 ? '9+' : item.unread}
                                                </Box>
                                            )}
                                        </Box>
                                    }
                                />
                            </ListItemButton>
                        </ListItem>
                    );
                })}

                {filteredList.length === 0 && (
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <SearchIcon sx={{ fontSize: 48, color: '#ddd', mb: 2 }} />
                        <Typography variant="body2" sx={{ color: '#999', fontSize: '0.9rem' }}>
                            {searchTerm ? 'No users found' : 'No conversations yet'}
                        </Typography>
                        {!searchTerm && (
                            <Typography variant="caption" sx={{ color: '#bbb', display: 'block', mt: 1 }}>
                                Start chatting with someone to see them here
                            </Typography>
                        )}
                    </Box>
                )}
            </List>
        </Drawer>
    );
}
