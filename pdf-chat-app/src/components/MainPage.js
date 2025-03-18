import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { FormControl, InputLabel, Select, MenuItem, Button, AppBar, Toolbar, Typography, IconButton, CircularProgress } from '@mui/material';
import { CloudUpload, Send } from '@mui/icons-material';
import apiService from '../services/apiService';
import ChatMessage from './ChatMessage';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function MainPage({ documents: initialDocuments, setDocuments }) {
    const [documents, setLocalDocuments] = useState(initialDocuments || []);
    const [selectedDocument, setSelectedDocument] = useState('');
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
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

    const handleDocumentChange = (event) => {
        const docId = event.target.value;
        setSelectedDocument(docId);

        if (docId) {
            // Fetch the PDF file using our API service
            apiService.getDocumentPdf(docId)
                .then(url => setPdfUrl(url))
                .catch(error => console.error('Error loading PDF:', error));

            // Reset chat messages when changing document
            setMessages([]);
            setCurrentPage(1);
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
        }
    };

    const jumpToPage = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Scroll the PDF viewer to the top of the new page
        if (pdfRef.current) {
            pdfRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // const sendMessage = async () => {
    //     if (!input.trim() || !selectedDocument) return;

    //     const userMessage = { text: input, sender: 'user' };
    //     setMessages(prevMessages => [...prevMessages, userMessage]);
    //     setInput('');
    //     setLoading(true);

    //     try {
    //         const response = await apiService.sendChatMessage(selectedDocument, input);

    //         const botMessage = {
    //             text: response.answer,
    //             sender: 'bot',
    //             sources: response.sources || []
    //         };

    //         setMessages(prevMessages => [...prevMessages, botMessage]);
    //     } catch (error) {
    //         console.error('Error sending message:', error);
    //         const errorMessage = {
    //             text: 'Sorry, I encountered an error processing your request.',
    //             sender: 'bot'
    //         };
    //         setMessages(prevMessages => [...prevMessages, errorMessage]);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const sendMessage = async () => {
        if (!input.trim() || !selectedDocument) return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInput('');
        setLoading(true);

        try {
            // Call the API service with proper error handling
            const response = await apiService.sendChatMessage(selectedDocument, input);

            // Check if we have a valid response
            if (response && response.answer) {
                const botMessage = {
                    text: response.answer,
                    sender: 'bot',
                    sources: response.sources || []
                };
                setMessages(prevMessages => [...prevMessages, botMessage]);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                text: 'Sorry, I encountered an error processing your request. Please try again later.',
                sender: 'bot'
            };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
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

    return (
        <div className="App">
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" style={{ flexGrow: 1 }}>
                        PDF Chat Assistant
                    </Typography>
                    <Button color="inherit" component={Link} to="/upload" startIcon={<CloudUpload />}>
                        Upload PDF
                    </Button>
                </Toolbar>
            </AppBar>

            <div className="main-container">
                <div className="pdf-container">
                    <div className="document-selector">
                        <FormControl fullWidth>
                            <InputLabel>Select Document</InputLabel>
                            <Select
                                value={selectedDocument}
                                onChange={handleDocumentChange}
                                label="Select Document"
                            >
                                <MenuItem value="">
                                    <em>None</em>
                                </MenuItem>
                                {documents.map((doc) => (
                                    <MenuItem key={doc.id} value={doc.id}>
                                        {doc.filename}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                    {pdfUrl && (
                        <div className="pdf-viewer" ref={pdfRef}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                                <Button
                                    disabled={currentPage <= 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    Previous
                                </Button>
                                <Typography>
                                    Page {currentPage} of {numPages || '?'}
                                </Typography>
                                <Button
                                    disabled={currentPage >= numPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    Next
                                </Button>
                            </div>

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
                        </div>
                    )}
                    {/* {pdfUrl && (
                        <div className="pdf-viewer" ref={pdfRef}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                                <Button
                                    disabled={currentPage <= 1}
                                    onClick={() => handlePageChange(currentPage - 1)}
                                >
                                    Previous
                                </Button>
                                <Typography>
                                    Page {currentPage} of {numPages}
                                </Typography>
                                <Button
                                    disabled={currentPage >= numPages}
                                    onClick={() => handlePageChange(currentPage + 1)}
                                >
                                    Next
                                </Button>
                            </div>

                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                options={{ workerSrc: `/pdf.worker.min.js` }}
                            >
                                <Page
                                    pageNumber={currentPage}
                                    renderTextLayer={true}
                                    renderAnnotationLayer={true}
                                    scale={1.2}
                                />
                            </Document>
                        </div>
                    )} */}

                </div>

                <div className="chat-container">
                    <div className="chat-messages">
                        {messages.map((message, index) => (
                            <ChatMessage
                                key={index}
                                message={message}
                                onSourceClick={jumpToPage}
                            />
                        ))}
                        {loading && (
                            <div className="message bot-message" style={{ display: 'flex', justifyContent: 'center' }}>
                                <CircularProgress size={24} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            // onKeyPress={handleKeyPress}
                            placeholder="Ask a question about the PDF..."
                            //disabled={!selectedDocument || loading}
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
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MainPage;