import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  List,
  ListItem,
  CssBaseline,
  AppBar,
  Toolbar,
  IconButton,
  Avatar,
  Chip,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import Login from './components/Login';
import UserList from './components/UserList';

// Use environment variable or default to localhost
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface Message {
  sender: string;
  message: string;
}

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loginError, setLoginError] = useState('');
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    if (isLoggedIn) {
      console.log('🔌 Initializing WebSocket connection to:', BACKEND_URL);
      const newSocket = io(BACKEND_URL);
      setSocket(newSocket);

      newSocket.on('connect', () => {
        console.log('✅ Connected to server');
        console.log('Socket ID:', newSocket.id);
        console.log('Socket connected status:', newSocket.connected);
        // Register username with backend using acknowledgement callback
        console.log('📝 Registering username:', username);
        newSocket.emit('register', { username }, (response: { success: boolean; message?: string }) => {
          if (response.success) {
            console.log('✅ Registration successful');
            setLoginError('');
          } else {
            console.error('❌ Registration failed:', response.message);
            setLoginError(response.message || 'Registration failed');
            setIsLoggedIn(false);
            newSocket.close();
          }
        });
      });

      // Listen for registration confirmation
      newSocket.on('register', (response: { success: boolean; message?: string }) => {
        if (response.success) {
          console.log('✅ Registration successful');
        } else {
          console.error('❌ Registration failed:', response.message);
        }
      });

      newSocket.on('userList', (users: string[]) => {
        console.log('👥 Connected users updated:', users);
        setConnectedUsers(users);
      });

      newSocket.on('msgToClient', (payload: Message) => {
        console.log('📨 Message received from server:', payload);
        setMessages((prev) => {
          const updated = [...prev, payload];
          console.log('📋 Messages array updated. Total messages:', updated.length);
          return updated;
        });
      });

      newSocket.on('error', (error: { message: string }) => {
        console.error('❌ Socket error:', error.message);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from server');
      });

      // Expose socket for debugging
      (window as any).socket = newSocket;

      return () => {
        console.log('🔌 Closing WebSocket connection');
        newSocket.close();
      };
    }
  }, [isLoggedIn, username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = (name: string) => {
    setUsername(name);
    setLoginError('');
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    if (socket) {
      socket.close();
    }
    setIsLoggedIn(false);
    setUsername('');
    setMessages([]);
    setLoginError('');
  };

  const sendMessage = () => {
    console.log('📤 Attempting to send message...');
    console.log('Socket exists:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('Message content:', message);

    if (socket && message.trim()) {
      const payload = { message: message.trim() };
      console.log('📤 Sending message to server:', payload);
      socket.emit('msgToServer', payload);
      setMessage('');
      console.log('✅ Message sent successfully');
    } else {
      if (!socket) {
        console.error('❌ Cannot send - Socket not initialized');
      } else if (!message.trim()) {
        console.warn('⚠️ Cannot send - Message is empty');
      }
    }
  };

  if (!isLoggedIn) {
    return (
      <>
        <CssBaseline />
        <Login onLogin={handleLogin} error={loginError} />
      </>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh', // Fallback
        minHeight: '100dvh', // Modern mobile browsers
        width: '100vw',
        background: '#f5f5f5',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
      }}
    >
      <CssBaseline />
      {/* Mobile-First Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          flexShrink: 0,
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: 56, sm: 64 },
            px: { xs: 1.5, sm: 2 },
          }}
        >
          <Avatar
            sx={{
              mr: { xs: 1.5, sm: 2 },
              width: { xs: 36, sm: 40 },
              height: { xs: 36, sm: 40 },
              background: 'rgba(255, 255, 255, 0.2)',
            }}
          >
            <PersonIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                lineHeight: 1.2,
              }}
            >
              Chat Room
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.9,
                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {username}
            </Typography>
          </Box>
          <IconButton
            color="inherit"
            onClick={() => setIsUserListOpen(true)}
            sx={{
              ml: 1,
              p: { xs: 1, sm: 1.5 },
            }}
          >
            <GroupIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleLogout}
            sx={{
              ml: 0.5,
              p: { xs: 1, sm: 1.5 },
            }}
          >
            <LogoutIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
        </Toolbar>
      </AppBar>

      <UserList
        open={isUserListOpen}
        onClose={() => setIsUserListOpen(false)}
        users={connectedUsers}
        currentUser={username}
      />

      {/* Mobile-First Messages Container */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 1, sm: 2 },
          maxWidth: { sm: '100%', md: '900px' },
          mx: 'auto',
          width: '100%',
        }}
      >
        {/* Messages List */}
        <Paper
          elevation={0}
          sx={{
            flexGrow: 1,
            mb: { xs: 1, sm: 1.5 },
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: { xs: 2, sm: 3 },
            background: '#fff',
            WebkitOverflowScrolling: 'touch',
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '3px',
            },
          }}
        >
          <List
            sx={{
              p: { xs: 1, sm: 2 },
              flex: 1,
            }}
          >
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender === username;
              return (
                <Fade in key={index} timeout={300}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
                      py: { xs: 0.5, sm: 0.75 },
                      px: { xs: 0.5, sm: 1 },
                    }}
                  >
                    <Chip
                      label={msg.sender}
                      size="small"
                      sx={{
                        mb: 0.5,
                        height: { xs: 18, sm: 20 },
                        fontSize: { xs: '0.65rem', sm: '0.7rem' },
                        background: isOwnMessage
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#e0e0e0',
                        color: isOwnMessage ? '#fff' : '#000',
                      }}
                    />
                    <Paper
                      elevation={1}
                      sx={{
                        p: { xs: 1.25, sm: 1.5 },
                        maxWidth: { xs: '85%', sm: '75%', md: '70%' },
                        background: isOwnMessage
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : '#f5f5f5',
                        color: isOwnMessage ? '#fff' : '#000',
                        borderRadius: { xs: 2.5, sm: 3 },
                        wordBreak: 'break-word',
                        boxShadow: isOwnMessage
                          ? '0 2px 8px rgba(102, 126, 234, 0.3)'
                          : '0 2px 4px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          lineHeight: 1.5,
                        }}
                      >
                        {msg.message}
                      </Typography>
                    </Paper>
                  </ListItem>
                </Fade>
              );
            })}
            <div ref={messagesEndRef} />
          </List>
        </Paper>

        {/* Mobile-First Input Area */}
        <Paper
          elevation={2}
          sx={{
            display: 'flex',
            gap: { xs: 0.75, sm: 1 },
            p: { xs: 1, sm: 1.5 },
            borderRadius: { xs: 2, sm: 3 },
            background: '#fff',
            flexShrink: 0,
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            multiline
            maxRows={4}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: { xs: 2, sm: 2.5 },
                fontSize: { xs: '0.95rem', sm: '1rem' },
                py: { xs: 0.75, sm: 1 },
              },
              '& .MuiOutlinedInput-input': {
                py: { xs: 1, sm: 1.25 },
              },
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!message.trim()}
            sx={{
              minWidth: { xs: 48, sm: 56 },
              height: { xs: 48, sm: 56 },
              borderRadius: { xs: 2, sm: 2.5 },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            <SendIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}

export default App;

