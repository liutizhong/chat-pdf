import React from 'react';
import { Typography, Chip } from '@mui/material';
function ChatMessage({ message, onSourceClick }) {
    const isBot = message.sender === 'bot';

    return (
        <div className={`message ${isBot ? 'bot-message' : 'user-message'}`}>
            <Typography variant="body1">{message.text}</Typography>

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