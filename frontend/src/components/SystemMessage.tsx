import { Box, Typography, Fade } from '@mui/material';

interface SystemMessageProps {
    message: string;
}

const SystemMessage = ({ message }: SystemMessageProps) => {
    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    my: 1,
                    px: 2,
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        color: 'text.secondary',
                        fontStyle: 'italic',
                        textAlign: 'center',
                        background: 'rgba(0, 0, 0, 0.05)',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 4,
                        fontSize: '0.75rem',
                    }}
                >
                    {message}
                </Typography>
            </Box>
        </Fade>
    );
};

export default SystemMessage;
