import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout as logoutAction } from '../store/slices/authSlice';
import { setActiveChat, toggleChatList, clearAllChats, addMessage, initializeChat } from '../store/slices/chatSlice';
import { clearSocket } from '../store/slices/socketSlice';
import { useSocket } from '../hooks/useSocket';
import { saveUsersToStorage } from '../utils/storage';
import {
  Box,
  TextField,
  Typography,
  Paper,
  ListItem,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  ExitToApp as LogoutIcon,
  Group as GroupIcon,
  PersonAdd as InviteIcon,
  List as ListIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import SystemMessage from '../components/SystemMessage';
import ChatList from '../components/ChatList';
import InviteFriend from '../components/InviteFriend';
import InvitationsList from '../components/InvitationsList';
import { isAdmin as checkIsAdmin } from '../config/admin';

function ChatPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Redux state
  const { username, isLoggedIn, isAdmin } = useAppSelector(state => state.auth);
  const { chats, activeChat, unreadCounts, isChatListOpen } = useAppSelector(state => state.chat);
  const { allUsers } = useAppSelector(state => state.users);
  const socket = useAppSelector(state => state.socket.socket);
  
  // Filter out admin from user lists
  const nonAdminUsers = allUsers.filter(u => !checkIsAdmin(u.username));
  
  // Initialize socket connection
  useSocket();
  
  // Local state for message input
  const [message, setMessage] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitationsListOpen, setInvitationsListOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Helper to get current messages for display
  const currentMessages = activeChat ? (chats[activeChat] || []) : [];

  // Redirect if not logged in or is admin
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/', { replace: true });
    } else if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isLoggedIn, isAdmin, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, activeChat]);

  // Auto-save users to localStorage whenever they change
  useEffect(() => {
    if (isLoggedIn && username && allUsers.length > 0) {
      saveUsersToStorage(username, allUsers);
    }
  }, [allUsers, username, isLoggedIn]);

  // Listen for invitation acceptance notifications
  useEffect(() => {
    if (socket && isLoggedIn) {
      const handleInvitationAccepted = (data: { inviteeEmail: string; timestamp: string }) => {
        console.log('🎉 Invitation accepted:', data);
        alert(`${data.inviteeEmail} accepted your invitation!`);
      };

      socket.on('invitationAccepted', handleInvitationAccepted);

      return () => {
        socket.off('invitationAccepted', handleInvitationAccepted);
      };
    }
  }, [socket, isLoggedIn]);

  const handleLogout = async () => {
    if (socket) {
      socket.close();
    }
    
    // Clear auth token
    const { authService } = await import('../services/authService');
    authService.logout();
    
    dispatch(logoutAction());
    dispatch(clearAllChats());
    dispatch(clearSocket());
    navigate('/', { replace: true });
  };

  const sendMessage = () => {
    console.log('📤 Attempting to send message...');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Message content:', message);

    if (socket && message.trim()) {
      const msgContent = message.trim();

      if (activeChat) {
        // Find user in allUsers (includes both online and offline)
        const targetUser = allUsers.find(u => u.username === activeChat);
        
        if (targetUser) {
          // Initialize chat if needed
          dispatch(initializeChat(activeChat));

          // If user is online, send via socket
          // The backend will echo the message back, which will be added to state
          if (targetUser.isOnline && targetUser.id) {
            console.log(`📤 Sending private message to ${targetUser.username} (${targetUser.id}) - ONLINE`);
            socket.emit('privateMessage', { to: targetUser.id, message: msgContent });
          } else {
            // For offline users, add message to local state only
            // (backend will handle delivery when they come online)
            console.log(`📤 Message saved for ${targetUser.username} - OFFLINE (will be delivered when online)`);
            const messageObj = {
              sender: username,
              message: msgContent,
              timestamp: new Date().toISOString(),
              isPrivate: true,
              recipient: activeChat,
            };
            dispatch(addMessage({ chatId: activeChat, message: messageObj }));
          }
          
          setMessage('');
          console.log('✅ Message processed successfully');
        } else {
          console.error('❌ User not found in user list');
        }
      } else {
        console.warn('⚠️ No active chat selected');
      }
    } else {
      if (!socket) {
        console.error('❌ Cannot send - Socket not initialized');
      } else if (!message.trim()) {
        console.warn('⚠️ Cannot send - Message is empty');
      }
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        background: '#f5f5f5',
        overflow: 'hidden',
      }}
    >
      <CssBaseline />

      {/* Sidebar (Chat List) */}
      <Box
        component="nav"
        sx={{
          width: { sm: 320 },
          flexShrink: { sm: 0 },
          display: { xs: isChatListOpen ? 'block' : 'none', sm: 'block' },
          height: '100%',
        }}
      >
        <ChatList
          open={true}
          onClose={() => dispatch(toggleChatList())}
          activeChat={activeChat}
          chats={chats}
          onSelectChat={(chatId) => {
            dispatch(setActiveChat(chatId));
            if (isChatListOpen) {
              dispatch(toggleChatList());
            }
          }}
          unreadCounts={unreadCounts}
          onlineUsers={nonAdminUsers}
          currentUsername={username}
          variant="permanent"
        />
      </Box>

      {/* Main Content (Chat Window) */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          width: { sm: `calc(100% - 320px)` },
        }}
      >
        {/* Header */}
        <AppBar
          position="static"
          elevation={0}
          sx={{
            background: '#fff',
            color: '#000',
            borderBottom: '1px solid rgba(0,0,0,0.12)',
          }}
        >
          <Toolbar sx={{ minHeight: 64 }}>
            {/* Mobile Menu Button */}
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => dispatch(toggleChatList())}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <GroupIcon />
            </IconButton>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Welcome, {username}!
              </Typography>
              {activeChat ? (
                <Typography variant="caption" color="text.secondary">
                  Chatting with {activeChat} • {allUsers.find(u => u.username === activeChat)?.isOnline ? 'Online' : 'Offline'}
                </Typography>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Select a conversation to start chatting
                </Typography>
              )}
            </Box>

            <IconButton
              onClick={() => setInvitationsListOpen(true)}
              color="inherit"
              title="View Invitations"
            >
              <ListIcon />
            </IconButton>
            <IconButton
              onClick={() => setInviteDialogOpen(true)}
              color="inherit"
              title="Invite Friend"
            >
              <InviteIcon />
            </IconButton>
            <IconButton onClick={handleLogout} color="inherit">
              <LogoutIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Messages Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            background: '#e5ddd5',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {!activeChat ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.6 }}>
              <ChatIcon sx={{ fontSize: 64, mb: 2, color: '#ccc' }} />
              <Typography variant="h6" color="text.secondary">
                Select a chat to start messaging
              </Typography>
            </Box>
          ) : (
            <>
              {currentMessages.map((msg, index) => {
                if (msg.type === 'system') {
                  return <SystemMessage key={index} message={msg.message} />;
                }
                const isOwnMessage = msg.sender === username;
                return (
                  <Fade in key={index} timeout={300}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                        py: 0.5,
                        px: 1,
                      }}
                    >
                      <Paper
                        elevation={1}
                        sx={{
                          p: 1.5,
                          maxWidth: '70%',
                          background: isOwnMessage ? '#d9fdd3' : '#fff',
                          color: '#000',
                          borderRadius: 2,
                          borderTopRightRadius: isOwnMessage ? 0 : 2,
                          borderTopLeftRadius: isOwnMessage ? 2 : 0,
                          position: 'relative',
                        }}
                      >
                        <Typography variant="body1" sx={{ fontSize: '0.95rem' }}>
                          {msg.message}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, fontSize: '0.7rem', opacity: 0.7 }}>
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Typography>
                      </Paper>
                    </ListItem>
                  </Fade>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>

        {/* Input Area */}
        {activeChat && (
          <Box sx={{ p: 2, background: '#f0f2f5', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              size="small"
              sx={{
                background: '#fff',
                borderRadius: 4,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 4,
                }
              }}
            />
            <IconButton
              color="primary"
              onClick={sendMessage}
              disabled={!message.trim()}
              sx={{
                background: '#1976d2',
                color: '#fff',
                '&:hover': { background: '#1565c0' }
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Invitation Dialogs */}
      <InviteFriend
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
      />
      <InvitationsList
        open={invitationsListOpen}
        onClose={() => setInvitationsListOpen(false)}
      />
    </Box>
  );
}

export default ChatPage;
