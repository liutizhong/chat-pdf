import React from 'react';
import { Typography, Chip, CircularProgress } from '@mui/material';

function ChatMessage({ message, onSourceClick }) {
    const isBot = message.sender === 'bot';
    const isProcessing = message.isProcessing;

    return (
        <div className={`message ${isBot ? 'bot-message' : 'user-message'}`}>
            {isProcessing ? (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={16} style={{ marginRight: '8px' }} />
                    <Typography variant="body1">{message.text}</Typography>
                </div>
            ) : (
                <Typography variant="body1">{message.text}</Typography>
            )}

            {isBot && message.sources && message.sources.length > 0 && (
                <div className="sources" style={{ marginTop: '8px' }}>
                    {message.sources.map((source, idx) => (
                        <Chip
                            key={idx}
                            label={`Source: Page ${source.page}`}
                            onClick={() => onSourceClick(source.page)}
                            size="small"
                            color="primary"
                            variant="outlined"
                            style={{ margin: '2px', cursor: 'pointer' }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default ChatMessage;