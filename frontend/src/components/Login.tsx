import { useState } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    Paper,
    Avatar,
    Fade,
    Slide,
    InputAdornment,
    AppBar,
    Toolbar,
    Alert,
    Collapse,
} from '@mui/material';
import {
    Chat as ChatIcon,
    Person as PersonIcon,
    ErrorOutline as ErrorIcon,
} from '@mui/icons-material';

interface LoginProps {
    onLogin: (username: string) => void;
    error?: string;
}

export default function Login({ onLogin, error }: LoginProps) {
    const [username, setUsername] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            onLogin(username.trim());
        }
    };

    return (
        <Box
            sx={{
                height: '100vh', // Fallback
                minHeight: '100dvh', // Modern mobile browsers
                width: '100vw',
                display: 'flex',
                flexDirection: 'column',
                background: '#f5f5f5',
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
            }}
        >
            {/* Mobile-First Header (Matching App.tsx) */}
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
                        justifyContent: 'center',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                            sx={{
                                width: { xs: 36, sm: 40 },
                                height: { xs: 36, sm: 40 },
                                background: 'rgba(255, 255, 255, 0.2)',
                            }}
                        >
                            <ChatIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        </Avatar>
                        <Typography
                            variant="h6"
                            component="div"
                            sx={{
                                fontWeight: 600,
                                fontSize: { xs: '1rem', sm: '1.25rem' },
                                letterSpacing: '0.5px',
                            }}
                        >
                            Chat Room
                        </Typography>
                    </Box>
                </Toolbar>
            </AppBar>

            <Container
                maxWidth="sm"
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: { xs: 2, sm: 3 },
                }}
            >
                <Fade in timeout={800}>
                    <Paper
                        elevation={0}
                        sx={{
                            width: '100%',
                            padding: { xs: 3, sm: 5 },
                            borderRadius: { xs: 2, sm: 3 },
                            background: '#fff',
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                        }}
                    >
                        <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
                            <Slide direction="down" in timeout={600}>
                                <Avatar
                                    sx={{
                                        width: { xs: 64, sm: 80 },
                                        height: { xs: 64, sm: 80 },
                                        margin: '0 auto 16px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                                    }}
                                >
                                    <PersonIcon sx={{ fontSize: { xs: 32, sm: 40 } }} />
                                </Avatar>
                            </Slide>

                            <Typography
                                variant="h5"
                                component="h1"
                                gutterBottom
                                sx={{
                                    fontWeight: 700,
                                    fontSize: { xs: '1.5rem', sm: '1.75rem' },
                                    color: '#1a1a1a',
                                    mb: 1,
                                }}
                            >
                                Welcome Back
                            </Typography>
                            <Typography
                                variant="body1"
                                color="text.secondary"
                                sx={{
                                    mb: 3,
                                    fontSize: { xs: '0.9rem', sm: '1rem' },
                                }}
                            >
                                Enter your name to join the conversation
                            </Typography>
                        </Box>

                        <Box component="form" onSubmit={handleSubmit}>
                            <Collapse in={!!error}>
                                <Alert
                                    severity="error"
                                    icon={<ErrorIcon fontSize="inherit" />}
                                    sx={{
                                        mb: 3,
                                        borderRadius: 2,
                                        background: '#ffebee',
                                        color: '#c62828',
                                        border: '1px solid #ffcdd2',
                                        '& .MuiAlert-icon': {
                                            color: '#c62828',
                                        },
                                        alignItems: 'center',
                                    }}
                                >
                                    {error}
                                </Alert>
                            </Collapse>
                            <TextField
                                fullWidth
                                label="Username"
                                variant="outlined"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoFocus
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <PersonIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{
                                    mb: 3,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        '&:hover fieldset': {
                                            borderColor: '#667eea',
                                        },
                                        '&.Mui-focused fieldset': {
                                            borderColor: '#667eea',
                                        },
                                    },
                                }}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                size="large"
                                disabled={!username.trim()}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                                    textTransform: 'none',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    transition: 'all 0.3s ease',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                                        boxShadow: '0 6px 16px rgba(102, 126, 234, 0.5)',
                                        transform: 'translateY(-1px)',
                                    },
                                    '&:active': {
                                        transform: 'translateY(0)',
                                    },
                                    '&:disabled': {
                                        background: '#e0e0e0',
                                        boxShadow: 'none',
                                    },
                                }}
                            >
                                Join Chat
                            </Button>

                            <Typography
                                variant="caption"
                                display="block"
                                textAlign="center"
                                color="text.secondary"
                                sx={{ mt: 3, opacity: 0.7 }}
                            >
                                Simple • Fast • Secure
                            </Typography>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    );
}
