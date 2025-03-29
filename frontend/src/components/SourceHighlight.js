import React, { useState } from 'react';
import { Paper, Typography, Box, IconButton, Collapse } from '@mui/material';
import { Close, ArrowForward, ExpandMore, ExpandLess } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { materialLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

function SourceHighlight({ source, onClose, onNavigate }) {
    const [expanded, setExpanded] = useState(true);

    // If there's no source text, just provide a simple version
    if (!source || !source.text) {
        return null;
    }

    const toggleExpand = (e) => {
        e.stopPropagation();
        setExpanded(!expanded);
    };

    return (
        <Paper 
            elevation={3} 
            sx={{
                position: 'absolute',
                bottom: '80px',
                right: '20px',
                width: '300px',
                p: 2,
                zIndex: 1000,
                backgroundColor: '#fff9c4', // Light yellow background
                borderLeft: '4px solid #fbc02d', // Amber accent
                maxHeight: '40vh', // Limit maximum height to 40% of viewport height
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        Source from Page {source.page}
                    </Typography>
                    <IconButton size="small" onClick={toggleExpand}>
                        {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                    </IconButton>
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <Close fontSize="small" />
                </IconButton>
            </Box>

            <Collapse in={expanded} timeout="auto" unmountOnExit sx={{ overflow: 'auto', maxHeight: 'calc(40vh - 80px)' }}>
                <Box sx={{ 
                    overflowY: 'auto', 
                    mb: 2,
                    pr: 1, // Add padding for scrollbar
                    maxHeight: '150px', // Fixed height for text content
                    '& p': { margin: '0.5em 0' },
                    '& h1, & h2, & h3, & h4, & h5, & h6': { margin: '0.5em 0' },
                    '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                    '& code': { backgroundColor: '#f5f5f5', padding: '0.2em 0.4em', borderRadius: '3px' },
                    '& pre': { margin: '0.5em 0', padding: 0 },
                    '& blockquote': { borderLeft: '3px solid #e0e0e0', margin: '0.5em 0', paddingLeft: '1em', fontStyle: 'italic' },
                    '& img': { maxWidth: '100%' }
                }}>
                    <ReactMarkdown
                        components={{
                            code({node, inline, className, children, ...props}) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={materialLight}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {source.text}
                    </ReactMarkdown>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 'auto' }}>
                    <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => onNavigate(source.page, source.text)}
                        sx={{ display: 'flex', alignItems: 'center' }}
                    >
                        <Typography variant="caption" sx={{ mr: 0.5 }}>
                            View in PDF
                        </Typography>
                        <ArrowForward fontSize="small" />
                    </IconButton>
                </Box>
            </Collapse>
        </Paper>
    );
}

export default SourceHighlight;