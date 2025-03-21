import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
    FormControl, InputLabel, Select, MenuItem, Button, AppBar, 
    Toolbar, Typography, IconButton, CircularProgress, Paper, Box,
    Drawer
} from '@mui/material';
import { CloudUpload, Send, Menu as MenuIcon } from '@mui/icons-material';
import apiService from '../services/apiService';
import ChatMessage from './ChatMessage';
import SourceHighlight from './SourceHighlight';
import Sidebar from './Sidebar';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function MainPage({ documents: initialDocuments, setDocuments }) {
    const [documents, setLocalDocuments] = useState(initialDocuments || []);
    const [selectedDocument, setSelectedDocument] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);
    const messagesEndRef = useRef(null);
    const pdfRef = useRef(null);

    useEffect(() => {
        // Scroll to the bottom of the messages
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        // Load documents if they weren't passed as props
        if (!documents || documents.length === 0) {
            apiService.getDocuments()
                .then(data => {
                    setLocalDocuments(data);
                    if (setDocuments) {
                        setDocuments(data);
                    }
                })
                .catch(error => console.error('Error fetching documents:', error));
        }
    }, [setDocuments]);

    const handleDocumentChange = (docId) => {
        setSelectedDocument(docId);

        if (docId) {
            // Fetch the PDF file using our API service
            apiService.getDocumentPdf(docId)
                .then(url => setPdfUrl(url))
                .catch(error => console.error('Error loading PDF:', error));

            // Reset chat messages when changing document
            setMessages([]);
            setCurrentPage(1);
            setSelectedSource(null);
        } else {
            setPdfUrl(null);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= numPages) {
            setCurrentPage(pageNumber);
            // Clear any selected source when manually changing pages
            setSelectedSource(null);
        }
    };

    // const jumpToPage = (pageNumber, sourceText = null) => {
    //     // Make sure page number is valid
    //     if (pageNumber < 1 || pageNumber > numPages) {
    //         console.warn(`Invalid page number: ${pageNumber}`);
    //         return;
    //     }
        
    //     // Set the current page
    //     setCurrentPage(pageNumber);
        
    //     // Add a visual indication that we're jumping to this page
    //     if (pdfRef.current) {
    //         // First scroll to make the PDF viewer visible
    //         pdfRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
    //         // Add a temporary highlight effect to the page container
    //         const pageContainer = pdfRef.current.querySelector('.react-pdf__Page');
    //         if (pageContainer) {
    //             pageContainer.style.boxShadow = '0 0 15px rgba(25, 118, 210, 0.8)';
    //             pageContainer.style.transition = 'box-shadow 0.5s ease-in-out';
                
    //             // Remove the highlight after a short delay
    //             setTimeout(() => {
    //                 pageContainer.style.boxShadow = 'none';
    //             }, 2000);
    //         }
    //     }
        
    //     // If we have specific text to highlight, display the source highlight component
    //     if (sourceText) {
    //         setSelectedSource({
    //             page: pageNumber,
    //             text: sourceText
    //         });
    //     }
    // };

    // const handleSourceClick = (source) => {
    //     // If source is just a page number
    //     if (typeof source === 'number') {
    //         jumpToPage(source);
    //         return;
    //     }

    //     // If source is an object with page and text
    //     if (source.page) {
    //         jumpToPage(source.page, source.text);
    //         // Set the selected source for highlighting
    //         setSelectedSource(source);
    //     }
    // };

// Update the jumpToPage function to properly handle the selected source
const jumpToPage = (pageNumber, sourceText = null) => {
    // Make sure page number is valid
    if (pageNumber < 1 || pageNumber > numPages) {
        console.warn(`Invalid page number: ${pageNumber}`);
        return;
    }
    
    // Set the current page
    setCurrentPage(pageNumber);
    
    // Add a visual indication that we're jumping to this page
    if (pdfRef.current) {
        // First scroll to make the PDF viewer visible
        pdfRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Add a temporary highlight effect to the page container
        const pageContainer = pdfRef.current.querySelector('.react-pdf__Page');
        if (pageContainer) {
            pageContainer.style.boxShadow = '0 0 15px rgba(25, 118, 210, 0.8)';
            pageContainer.style.transition = 'box-shadow 0.5s ease-in-out';
            
            // Remove the highlight after a short delay
            setTimeout(() => {
                pageContainer.style.boxShadow = 'none';
            }, 2000);
        }
    }
    
    // If we have specific text to highlight, display the source highlight component
    if (sourceText) {
        // Clear any existing source first to ensure the component re-renders
        setSelectedSource(null);
        
        // Use setTimeout to ensure the state updates in the correct order
        setTimeout(() => {
            setSelectedSource({
                page: pageNumber,
                text: sourceText
            });
        }, 0);
    }
};
    const handleSourceClick = (source) => {
        // Clear any previously selected source first
        setSelectedSource(null);
        
        // If source is just a page number
        if (typeof source === 'number') {
            jumpToPage(source);
            return;
        }
    
        // If source is an object with page and text
        if (source && source.page) {
            // Use setTimeout to ensure state update happens after the previous setSelectedSource(null)
            setTimeout(() => {
                jumpToPage(source.page, source.text);
                // Set the selected source for highlighting
                setSelectedSource({
                    page: source.page,
                    text: source.text || ''
                });
            }, 0);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !selectedDocument) return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInput('');
        setLoading(true);
        setSelectedSource(null); // Clear any selected source

        // First, show a "processing" message that can be updated
        const processingMessageId = Date.now();
        const processingMessage = {
            id: processingMessageId,
            text: 'Processing your question...',
            sender: 'bot',
            isProcessing: true
        };

        setMessages(prevMessages => [...prevMessages, processingMessage]);

        try {
            // Call the API service with proper error handling
            const response = await apiService.sendChatMessage(selectedDocument, input);

            // Check if we have a valid response
            if (response && response.answer) {
                // Format sources to include page numbers and source text if available
                const formattedSources = response.sources && response.sources.map(source => ({
                    page: source.page || source.page_number,
                    text: source.text || source.content || '',
                    metadata: source.metadata || {}
                }));

                // Replace the processing message with the actual response
                const botMessage = {
                    id: processingMessageId,
                    text: response.answer,
                    sender: 'bot',
                    sources: formattedSources || []
                };

                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.id === processingMessageId ? botMessage : msg
                    )
                );

                // If we have sources with page numbers, automatically jump to the first source
                if (formattedSources && formattedSources.length > 0 && formattedSources[0].page) {
                    jumpToPage(formattedSources[0].page, formattedSources[0].text);
                }
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Error sending message:', error);

            // Customize error message based on error type
            let errorText = 'Sorry, I encountered an error processing your request. Please try again later.';

            if (error.customMessage) {
                errorText = error.customMessage;
            } else if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                errorText = 'Your question is taking longer than expected to process. Please try a simpler question or try again later.';
            }

            // Replace the processing message with the error message
            const errorMessage = {
                id: processingMessageId,
                text: errorText,
                sender: 'bot'
            };

            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg.id === processingMessageId ? errorMessage : msg
                )
            );
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <div className="App">
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        PDF Chat Assistant
                    </Typography>
                    <Button color="inherit" component={Link} to="/upload" startIcon={<CloudUpload />}>
                        Upload PDF
                    </Button>
                </Toolbar>
            </AppBar>

            <div className="main-container" style={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
                {/* Sidebar for mobile */}
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                    }}
                >
                    <Sidebar 
                        documents={documents} 
                        selectedDocument={selectedDocument} 
                        onDocumentSelect={handleDocumentChange} 
                    />
                </Drawer>
                
                {/* Sidebar for desktop */}
                <Box
                    component="nav"
                    sx={{ width: { sm: 240 }, flexShrink: { sm: 0 }, display: { xs: 'none', sm: 'block' } }}
                >
                    <Sidebar 
                        documents={documents} 
                        selectedDocument={selectedDocument} 
                        onDocumentSelect={handleDocumentChange} 
                    />
                </Box>
                <div className="pdf-container" style={{ flex: 1, overflow: 'auto', padding: '20px', position: 'relative' }}>
                    {pdfUrl && (
                        <Paper elevation={2} className="pdf-viewer" ref={pdfRef} style={{ padding: '15px' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 2 }}>
                                <Button
                                    variant="outlined"
                                    disabled={currentPage <= 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    Previous
                                </Button>
                                <Typography variant="subtitle1">
                                    Page {currentPage} of {numPages || '?'}
                                </Typography>
                                <Button
                                    variant="outlined"
                                    disabled={currentPage >= numPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    Next
                                </Button>
                            </Box>

                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={<CircularProgress />}
                                error={<Typography color="error">Error loading PDF!</Typography>}
                                options={{
                                    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                                    cMapPacked: true,
                                    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts`
                                }}
                            >
                                {numPages && (
                                    <Page
                                        key={`page_${currentPage}`}
                                        pageNumber={currentPage}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                        scale={1.2}
                                        loading={<CircularProgress size={20} />}
                                    />
                                )}
                            </Document>
                        </Paper>
                    )}
                    
                    {/* Source Highlight Pop-up */}
                    {selectedSource && (
                        <SourceHighlight 
                            source={selectedSource}
                            onClose={() => setSelectedSource(null)}
                            onNavigate={jumpToPage}
                        />
                    )}
                </div>

                <div className="chat-container" style={{ 
                    width: '40%', 
                    minWidth: '300px', 
                    borderLeft: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div className="chat-messages" style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {messages.map((message, index) => (
                            <ChatMessage
                                key={index}
                                message={message}
                                onSourceClick={handleSourceClick}
                            />
                        ))}
                        {loading && (
                            <div className="message bot-message" style={{ display: 'flex', justifyContent: 'center' }}>
                                <CircularProgress size={24} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <Paper elevation={2} className="chat-input" style={{ 
                        padding: '10px', 
                        display: 'flex', 
                        borderTop: '1px solid #e0e0e0'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask a question about the PDF..."
                            disabled={!selectedDocument || loading}
                            style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '4px',
                                border: '1px solid #ddd'
                            }}
                        />
                        <Button
                            variant="contained"
                            endIcon={<Send />}
                            onClick={sendMessage}
                            disabled={!selectedDocument || !input.trim() || loading}
                            style={{ marginLeft: '10px' }}
                        >
                            Send
                        </Button>
                    </Paper>
                </div>
            </div>
        </div>
    );
}

export default MainPage;