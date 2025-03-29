import React from 'react';
import { Typography, Chip, CircularProgress, Paper, Box } from '@mui/material';
import { Book, LocationOn } from '@mui/icons-material';

function ChatMessage({ message, onSourceClick }) {
    const isBot = message.sender === 'bot';
    const isProcessing = message.isProcessing;

    // Helper function to format sources nicely
    const formatSourceLocation = (source) => {
        if (source.text && source.text.length > 30) {
            return `${source.text.substring(0, 30)}...`;
        }
        return source.text || `Page ${source.page}`;
    };

    return (
        <Paper 
            elevation={1} 
            className={`message ${isBot ? 'bot-message' : 'user-message'}`}
            sx={{
                my: 1,
                p: 2,
                bgcolor: isBot ? '#f5f5f5' : '#e3f2fd',
                borderRadius: 2,
                maxWidth: '80%',
                alignSelf: isBot ? 'flex-start' : 'flex-end',
                position: 'relative'
            }}
        >
            {isProcessing ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} sx={{ mr: 1 }} />
                    <Typography variant="body1">{message.text}</Typography>
                </Box>
            ) : (
                <Typography variant="body1">{message.text}</Typography>
            )}

            {isBot && message.sources && message.sources.length > 0 && (
                <Box className="sources" sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="caption" sx={{ width: '100%', color: 'text.secondary' }}>
                        Sources:
                    </Typography>
                    {message.sources.map((source, idx) => (
                            <Chip
                                key={idx}
                                icon={source.text ? <Book fontSize="small" /> : <LocationOn fontSize="small" />}
                                label={`Page ${source.page}`}
                                onClick={() => onSourceClick(source.page)}
                                size="small"
                                color="primary"
                                variant="outlined"
                                sx={{ m: '2px', cursor: 'pointer' }}
                            />
                    ))}
                </Box>
            )}
        </Paper>
    );
}

export default ChatMessage;