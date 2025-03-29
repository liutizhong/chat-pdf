import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
    FormControl, InputLabel, Select, MenuItem, Button, AppBar, 
    Toolbar, Typography, IconButton, CircularProgress, Paper, Box,
    Drawer, Collapse, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import { CloudUpload, Send, Menu as MenuIcon, ExpandMore, ExpandLess, ArrowForward } from '@mui/icons-material';
import apiService from '../services/apiService';
import ChatMessage from './ChatMessage';
import SourceHighlight from './SourceHighlight';
import Sidebar from './Sidebar';

// Define fallback worker URLs
window.PDFWorkerFallbacks = [
    `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`
];

// Initialize PDF.js worker with enhanced error handling
const initializePdfWorker = () => {
    try {
        // Check if pdfjs is already initialized
        if (!pdfjs.GlobalWorkerOptions.workerSrc) {
            // Try to detect if we're in development mode
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Define worker source based on environment
            let pdfWorkerSrc = isDevelopment ? 
                `/pdf.worker.min.js?v=${Date.now()}` : // Add cache busting for development
                `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
            
            // In development, verify the worker file exists before setting it
            if (isDevelopment) {
                console.log('Checking local PDF.js worker availability');
                return fetch(pdfWorkerSrc, { cache: 'no-cache' })
                    .then(response => {
                        if (!response.ok) {
                            console.warn('Local worker not found, falling back to CDN');
                            pdfWorkerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
                        }
                        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
                        console.log('PDF.js worker source set to:', pdfWorkerSrc);
                        return true;
                    })
                    .catch(err => {
                        console.warn('Error checking local worker, falling back to CDN:', err);
                        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
                        return true;
                    });
            } else {
                // In production, directly use CDN
                pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
                console.log('PDF.js worker source set to:', pdfWorkerSrc);
                return Promise.resolve(true);
            }
        } else {
            console.log('PDF.js worker already initialized');
            return Promise.resolve(true);
        }
    } catch (error) {
        console.error('Error initializing PDF.js worker:', error);
        return Promise.reject(error);
    }
};

// Initialize worker immediately with enhanced error handling
const initializeWithRetry = (attempt = 0) => {
    const maxAttempts = 3;
    
    return initializePdfWorker()
        .then(() => {
            console.log('PDF.js worker initialized successfully');
            return true;
        })
        .catch(err => {
            console.error(`Failed to initialize PDF.js worker (attempt ${attempt + 1}/${maxAttempts}):`, err);
            
            if (attempt < maxAttempts - 1) {
                return new Promise(resolve => {
                    setTimeout(() => {
                        initializeWithRetry(attempt + 1).then(resolve);
                    }, 1000 * (attempt + 1)); // Exponential backoff
                });
            }
            
            // Provide more detailed error information
            const error = new Error('Failed to initialize PDF.js after multiple attempts');
            error.details = {
                attempts: maxAttempts,
                lastError: err,
                workerSrcsTried: window.PDFWorkerFallbacks
            };
            throw error;
        });
};

// Track worker initialization status
let workerInitialized = false;
let workerInitializationPromise = null;

// Ensure worker is initialized before any PDF operations
const ensureWorkerInitialized = async () => {
  if (workerInitialized) return true;
  
  if (!workerInitializationPromise) {
    workerInitializationPromise = initializeWithRetry();
  }
  
  try {
    await workerInitializationPromise;
    workerInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize PDF.js worker:', error);
    throw error;
  }
};

initializeWithRetry();

// Pre-load the worker script once when component is mounted
const preloadPdfWorker = () => {
  try {
    // Check if the worker script is already in the document
    const existingScript = document.querySelector(`script[src="${pdfjs.GlobalWorkerOptions.workerSrc}"]`);
    if (existingScript) {
      console.log('Worker script already exists in document');
      return existingScript;
    }
    
    // Create and load a new worker script
    let workerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
    
    const script = document.createElement('script');
    script.src = workerSrc;
    script.async = true;
    script.onerror = () => {
      console.error('Failed to load PDF worker script:', workerSrc);
      // Removed setPdfError call since this is outside component scope
    };
    
    document.head.appendChild(script);
    console.log('Preloaded worker script:', workerSrc);
    
    return script;
  } catch (error) {
    console.error("Error preloading PDF.js worker:", error);
    // Removed setPdfError call since this is outside component scope
    return null;
  }
};

function MainPage({ documents: initialDocuments, setDocuments }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [documents, setLocalDocuments] = useState(initialDocuments || []);
    const [selectedDocument, setSelectedDocument] = useState('');
    const [mobileOpen, setMobileOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const inputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [selectedSource, setSelectedSource] = useState(null);
    const [outline, setOutline] = useState(null);
    const [tocOpen, setTocOpen] = useState(false);
    const [pdfError, setPdfError] = useState(null);
    const [workerLoaded, setWorkerLoaded] = useState(false);
    const [pdfKey, setPdfKey] = useState(1); // Used to force remount of PDF component
    const messagesEndRef = useRef(null);
    const pdfRef = useRef(null);
    const pdfInstanceRef = useRef(null); // Reference to PDF instance
    const workerScriptRef = useRef(null);
    const loadingAttemptRef = useRef(0); // Track loading attempts to prevent race conditions
    
    // 使用useMemo缓存PDF选项以避免不必要的重新渲染
    // 主容器样式
const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    height: '100vh',
    width: '100%',
    overflow: 'hidden'
};

// PDF预览区域样式
const pdfViewerStyle = {
    flex: 1,
    transition: 'all 0.3s ease',
    height: '100%',
    overflow: 'auto',
    display: 'flex',
    width: `calc(100% - ${sidebarCollapsed ? '64px' : '240px'})`
};

const pdfOptions = useMemo(() => ({
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
        disableAutoFetch: false,
        disableStream: false,
        disableRange: false,
        externalLinkTarget: '_blank',
        disableCreateObjectURL: false,
        disableFontFace: false,
        ignoreErrors: true,
        // 禁用可能导致工作线程问题的功能
        disableOptionalContentConfig: true,
        useSystemFonts: false,
        isEvalSupported: false,
        // Add more resilient options
        canvasMaxAreaInBytes: 8192 * 8192, // Increase memory limit
        useWorkerFetch: true, // Use worker for fetching where possible
        pageViewMode: 'single', // Simpler page mode to reduce worker load
        disableTelemetry: true, // Disable any telemetry to reduce worker activity
        scale: 1.0 // Set default scale to fit container
    }), []);

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

    // Enhanced PDF loading with progressive loading and better error handling
    useEffect(() => {
        if (pdfUrl && !pdfError) {
            console.log('Loading PDF:', pdfUrl);
            
            let loadingTask;
            let timeoutId;
            let validationTimeoutId;
            let isMounted = true;
            
            const loadPdf = async () => {
                try {
                    // Only validate if it's a blob URL (which we control)
                    if (pdfUrl.startsWith('blob:')) {
                        // Progressive loading with multiple attempts
                        loadingTask = pdfjs.getDocument({
                            url: pdfUrl,
                            disableAutoFetch: false,
                            disableStream: false,
                            maxImageSize: -1, // No limit on image size
                            disableRange: false // Enable range requests
                        });
                        
                        // Initial validation timeout (shorter)
                        validationTimeoutId = setTimeout(() => {
                            if (isMounted) {
                                console.log('Initial PDF validation timeout');
                                setPdfError('PDF is loading... Please wait');
                            }
                        }, 5000);
                        
                        // Main loading timeout (longer)
                        timeoutId = setTimeout(() => {
                            if (isMounted) {
                                console.log('PDF loading timeout reached');
                                setPdfError('PDF loading is taking longer than expected. The document may be large.');
                                loadingAttemptRef.current++;
                            }
                        }, 45000); // 45 second timeout
                        
                        const doc = await loadingTask.promise;
                        
                        if (isMounted) {
                            clearTimeout(validationTimeoutId);
                            clearTimeout(timeoutId);
                            
                            // Quick check of first page to validate document
                            const page = await doc.getPage(1);
                            await page.getTextContent();
                            page.cleanup();
                            
                            doc.destroy();
                            console.log('PDF loaded successfully');
                            setPdfError(null);
                        }
                    }
                } catch (error) {
                    if (isMounted) {
                        console.error('PDF loading error:', error);
                        
                        // Different error messages based on error type
                        let errorMsg = 'Error loading PDF';
                        if (error.name === 'PasswordException') {
                            errorMsg = 'PDF requires a password';
                        } else if (error.name === 'InvalidPDFException') {
                            errorMsg = 'Invalid PDF file';
                        } else if (error.message.includes('timeout')) {
                            errorMsg = 'PDF loading timeout. Try again or check your connection.';
                        }
                        
                        setPdfError(errorMsg);
                        setPdfKey(prevKey => prevKey + 1);
                        
                        // Auto-retry after delay
                        setTimeout(() => {
                            if (isMounted) {
                                setPdfError(null);
                                handleDocumentChange(selectedDocument);
                            }
                        }, 2000);
                    }
                }
            };
            
            loadPdf();
            
            return () => {
                isMounted = false;
                clearTimeout(timeoutId);
                clearTimeout(validationTimeoutId);
                if (loadingTask) {
                    loadingTask.destroy();
                }
            };
        }
    }, [pdfUrl, pdfError, selectedDocument]);

    // Centralized worker error handler
    const handleWorkerError = (error) => {
        console.error('PDF.js worker error:', error);
        
        const maxAttempts = 3;
        let loadAttempt = 0;
        const tryLoadWorker = () => {
            // Worker loading logic here
        };
        
        // Increment attempt counter
        loadAttempt++;
        
        if (loadAttempt < maxAttempts) {
            console.log(`Retrying worker initialization (attempt ${loadAttempt})...`);
            setTimeout(tryLoadWorker, 1000 * loadAttempt); // Exponential backoff
        } else {
            const errorMessage = 'Failed to initialize PDF viewer after multiple attempts. ';
            const suggestion = window.PDFWorkerFallbacks && window.PDFWorkerFallbacks.length > 0 
                ? 'Please check your internet connection and refresh the page.' 
                : 'Please ensure the worker script is available at the specified path.';
            
            setPdfError(errorMessage + suggestion);
            setWorkerLoaded(false);
        }
    };

    // Initialize PDF.js worker with enhanced error handling and fallback
    useEffect(() => {
        console.log('Initializing PDF.js worker with enhanced error handling...');
        let loadAttempt = 0;
        const maxAttempts = 3;
        
        const abortController = new AbortController();
        const signal = abortController.signal;
        
        const tryLoadWorker = () => {
            if (signal.aborted) return;
            
            // Clean up any previous script reference
            if (workerScriptRef.current) {
                try {
                    document.head.removeChild(workerScriptRef.current);
                    workerScriptRef.current = null;
                } catch (err) {
                    console.warn('Error removing previous worker script:', err);
                }
            }
            
            // Try main worker first, then fallbacks if available
            let workerSrc = pdfjs.GlobalWorkerOptions.workerSrc;
            if (loadAttempt > 0 && window.PDFWorkerFallbacks && window.PDFWorkerFallbacks.length > 0) {
                const fallbackIndex = (loadAttempt - 1) % window.PDFWorkerFallbacks.length;
                workerSrc = window.PDFWorkerFallbacks[fallbackIndex];
                console.log(`Attempt ${loadAttempt}: Trying fallback worker URL: ${workerSrc}`);
                
                // Update the global worker source
                pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
            }

            // Create and load the worker script
            const script = document.createElement('script');
            script.src = workerSrc;
            script.async = true;
            
            script.onload = () => {
                if (signal.aborted) return;
                
                console.log('PDF.js worker script loaded, verifying...');
                
                // Add delay to ensure worker is fully initialized
                setTimeout(() => {
                    if (signal.aborted) return;
                    
                    try {
                        // Test with a minimal PDF to verify worker functionality
                        const testPdfTask = pdfjs.getDocument({
                            url: 'data:application/pdf;base64,JVBERi0xLjQKJdP0zOEKMSAwIG9iago8PAovQ3JlYXRpb25EYXRlIChEOjIwMjQwMzI5MDAwMDAwKQovUHJvZHVjZXIgKHRlc3QpCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9DYXRhbG9nCi9QYWdlcyAzIDAgUgo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvPGFnZXMKL0NvdW50IDEKPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZgowMDAwMDAwMDE1IDAwMDAwIG4KMDAwMDAwMDA4NiAwMDAwMCBuCjAwMDAwMDAxMzUgMDAwMDAgbgp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMiAwIFIKL0luZm8gMSAwIFIKPj4Kc3RhcnR4cmVmCjE3NQolJUVPRgo=',
                            disableStream: true,
                            disableAutoFetch: true
                        });
                        
                        testPdfTask.promise
                            .then(doc => {
                                doc.destroy();
                                console.log('PDF.js worker verified successfully');
                                setWorkerLoaded(true);
                                setPdfError(null); // Clear any previous errors
                            })
                            .catch(error => {
                                console.error('PDF.js worker verification failed:', error);
                                handleWorkerError(error);
                            });
                    } catch (error) {
                        console.error('Error during worker verification:', error);
                        handleWorkerError(error);
                    }
                }, 500);
            };
            
            script.onerror = (error) => {
                if (signal.aborted) return;
                
                console.error(`Error loading PDF.js worker script (attempt ${loadAttempt + 1}):`, error);
                loadAttempt++;
                
                if (loadAttempt < maxAttempts) {
                    console.log(`Retrying with fallback (${loadAttempt})...`);
                    setTimeout(tryLoadWorker, 1000); // Try again after a delay
                } else {
                    setPdfError('Failed to load PDF viewer. Please refresh the page and try again.');
                }
            };
            
            document.head.appendChild(script);
            workerScriptRef.current = script;
        };
        
        // Start the loading process
        tryLoadWorker();
        
        return () => {
            // 中止进行中的初始化过程
            abortController.abort();
            
            // Clean up script on unmount
            if (workerScriptRef.current) {
                try {
                    document.head.removeChild(workerScriptRef.current);
                } catch (err) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, []);

    // Only handle document load success through PDF.js document component
    useEffect(() => {
        if (pdfUrl && !workerLoaded) {
            // Set a default loading state until worker is ready
            setPdfError(null);
            setOutline(null);
        }
    }, [pdfUrl, workerLoaded]);

    const [heartbeatInterval, setHeartbeatInterval] = useState(null);

    const handleDocumentChange = (docId) => {
        setSelectedDocument(docId);
        setPdfError(null); // Reset any error state

        // Clear previous heartbeat interval
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            setHeartbeatInterval(null);
        }

        if (docId) {
            // Add loading indicator
            setPdfUrl(null);
            
            // Reset state for the new document
            setMessages([]);
            setCurrentPage(1);
            setSelectedSource(null);
            setOutline(null);
            
            // Increment the attempt counter to track loading attempts
            loadingAttemptRef.current++; 
            
            // Use our safe fetch implementation
            safeFetchPdf(docId)
                .then(url => {
                    if (url) {
                        setPdfUrl(url);
                        
                        // Setup heartbeat check for PDF
                        const interval = setInterval(() => {
                            if (pdfInstanceRef.current) {
                                pdfInstanceRef.current.getMetadata().catch(err => {
                                    console.warn('PDF heartbeat check failed:', err);
                                    setPdfError('PDF连接异常，正在尝试恢复...');
                                    handleDocumentChange(docId); // Re-fetch PDF
                                });
                            }
                        }, 30000); // Check every 30 seconds
                        
                        setHeartbeatInterval(interval);
                        
                        // Cleanup interval on unmount
                        return () => {
                            if (interval) {
                                clearInterval(interval);
                            }
                        };
                    }
                })
                .catch(error => {
                    console.error('Failed to load PDF:', error);
                    setPdfError('Could not load the PDF. Please try again.');
                });
        } else {
            setPdfUrl(null);
        }
    };
    
    // Separate message input handler that doesn't trigger PDF operations
    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const onDocumentLoadSuccess = (pdf) => {
        if (!pdf) {
            console.error('PDF object is undefined or null');
            setPdfError('无法加载PDF文档，请重试');
            return;
        }
        
        console.log('PDF loaded successfully:', pdf.numPages, 'pages');
        
        // 确保numPages是有效值
        if (pdf.numPages && typeof pdf.numPages === 'number' && pdf.numPages > 0) {
            setNumPages(pdf.numPages);
            
            // 重置页码到有效范围
            if (currentPage > pdf.numPages) {
                setCurrentPage(1);
            }
        } else {
            console.warn('Invalid numPages:', pdf.numPages);
            setNumPages(1); // 设置默认值
        }
        
        setPdfError(null); // Reset error state on successful load
        
        // Store PDF instance reference
        pdfInstanceRef.current = pdf;
        
        // Save a reference to check if worker disconnects
        try {
            // 检查transport和messageHandler是否存在并正确初始化
            if (pdf.transport) {
                console.log('PDF transport verified');
                
                if (pdf.transport.messageHandler && pdf.transport.messageHandler.comObj) {
                    console.log('PDF worker connection verified');
                } else {
                    console.warn('PDF worker message handler not properly established');
                }
            } else {
                console.warn('PDF transport not properly established');
            }
        } catch (err) {
            console.error('Error checking worker connection:', err);
        }
        
        // 不再需要提取目录
        setOutline(null);
    };

    const handlePageChange = (pageNumber) => {
        if (pageNumber >= 1 && pageNumber <= numPages) {
            setCurrentPage(pageNumber);
            // Clear any selected source when manually changing pages
            setSelectedSource(null);
        }
    };

    // Update the jumpToPage function to properly handle the selected source
    const jumpToPage = (pageNumber, sourceText = null) => {
        try {
            // Make sure page number is valid
            if (!numPages) {
                console.warn('Cannot jump to page - PDF not loaded');
                return;
            }
            
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
        } catch (error) {
            console.error('Error jumping to page:', error);
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

    const handleDocumentError = (error) => {
        console.error('PDF loading error:', error);
        setPdfError('Error loading PDF. The document may be corrupted or not properly formatted.');
    };

    // Add a cleanup effect for blob URLs to prevent memory leaks
    useEffect(() => {
        // Store the current URL for cleanup
        const currentUrl = pdfUrl;
        
        // Cleanup function to revoke object URLs
        return () => {
            if (currentUrl && currentUrl.startsWith('blob:')) {
                console.log('Revoking blob URL:', currentUrl);
                try {
                    URL.revokeObjectURL(currentUrl);
                } catch (error) {
                    console.error('Error revoking blob URL:', error);
                }
            }
        };
    }, [pdfUrl]);

    // Add a direct PDF loading function that handles errors more gracefully
    const safeFetchPdf = useCallback(async (docId) => {
        if (!docId) return null;
        
        console.log('Starting safe PDF fetch for document:', docId);
        setPdfError(null);
        setPdfUrl(null);
        
        try {
            // Use a direct fetch with timeout rather than going through react-pdf's loader
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            // Get the raw PDF URL first
            const response = await fetch(`/api/documents/${docId}/pdf`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                signal: controller.signal
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
            }
            
            // Get the PDF data as a blob
            const pdfBlob = await response.blob();
            clearTimeout(timeoutId);
            
            if (pdfBlob.size === 0) {
                throw new Error('Received empty PDF data');
            }
            
            // Force the component to remount
            setPdfKey(prevKey => prevKey + 1);
            
            // Create a blob URL from the PDF data
            const blobUrl = URL.createObjectURL(
                new Blob([pdfBlob], { type: 'application/pdf' })
            );
            
            console.log('Successfully created PDF blob URL with size:', pdfBlob.size);
            return blobUrl;
        } catch (error) {
            console.error('Error in safeFetchPdf:', error);
            setPdfError(`Failed to load PDF: ${error.message}`);
            return null;
        }
    }, []);

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
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                        collapsed={sidebarCollapsed}
                        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                    />
                </Box>
                <div className="pdf-container" style={{ 
                    ...pdfViewerStyle, 
                    position: 'relative',
                    transition: 'all 0.3s ease', // 添加平滑过渡效果
                    paddingLeft: '0' // 确保没有额外的内边距
                }}>
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

                            <Box sx={{ display: 'flex', width: '100%' }}>
                                {/* PDF Document */}
                                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                    {pdfError ? (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            height: '60vh',
                                            p: 3
                                        }}>
                                            <Typography variant="body1" color="error" gutterBottom>
                                                {pdfError}
                                            </Typography>
                                            <Button 
                                                variant="outlined" 
                                                color="primary" 
                                                onClick={() => {
                                                    setPdfError(null);
                                                    handleDocumentChange(selectedDocument);
                                                }}
                                                sx={{ mt: 2 }}
                                            >
                                                Retry
                                            </Button>
                                        </Box>
                                    ) : !workerLoaded ? (
                                        <Box sx={{ 
                                            display: 'flex', 
                                            flexDirection: 'column', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            height: '60vh' 
                                        }}>
                                            <CircularProgress />
                                            <Typography variant="body2" sx={{ mt: 2 }}>
                                                Loading PDF viewer...
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Document
                                            key={`${selectedDocument}-${workerLoaded}-${loadingAttemptRef.current}-${pdfKey}`}
                                            file={pdfUrl}
                                            onLoadSuccess={onDocumentLoadSuccess}
                                            onLoadError={(error) => {
                                                console.error('Error loading PDF document:', error);
                                                
                                                // Use a universal approach to all loading errors - force remount and retry
                                                console.log('Using universal PDF error recovery strategy');
                                                
                                                // Force remount by changing key
                                                setPdfKey(prevKey => prevKey + 1);
                                                
                                                // Clear any existing data
                                                setPdfUrl(null);
                                                
                                                // Set a meaningful error message
                                                let errorMessage = 'PDF加载失败，正在尝试恢复...';
                                                setPdfError(errorMessage);
                                                
                                                // Wait a moment then try direct loading
                                                setTimeout(() => {
                                                    console.log('Attempting recovery via direct fetch');
                                                    setPdfError(null);
                                                    
                                                    // Try loading again with our safe fetch method
                                                    safeFetchPdf(selectedDocument)
                                                        .then(url => {
                                                            if (url) {
                                                                console.log('Recovery succeeded');
                                                                setPdfUrl(url);
                                                            }
                                                        })
                                                        .catch(recoveryError => {
                                                            console.error('Recovery failed:', recoveryError);
                                                            setPdfError('无法加载PDF，请刷新页面重试');
                                                        });
                                                }, 1000);
                                            }}
                                            loading={
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    height: '60vh' 
                                                }}>
                                                    <CircularProgress />
                                                    <Typography variant="body2" sx={{ mt: 2 }}>
                                                        Loading PDF... Please wait
                                                    </Typography>
                                                </Box>
                                            }
                                            options={{
                                                ...pdfOptions,
                                                // Add timeout options to prevent long-hanging requests
                                                httpHeaders: {
                                                    'Cache-Control': 'no-cache',
                                                    'Pragma': 'no-cache'
                                                },
                                                withCredentials: false, // Avoid CORS issues with credentials
                                                cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
                                                enableXfa: false, // Disable XFA to reduce complexity
                                            }}
                                        >
                                            <Page 
                                                key={`page_${currentPage}_${selectedDocument}`}
                                                pageNumber={currentPage}
                                                renderTextLayer={false}
                                                renderAnnotationLayer={false}
                                                renderInteractiveForms={false}
                                                renderMode="canvas"
                                                canvasBackground="#ffffff"
                                                scale={1.2}
                                                loading={<CircularProgress />}
                                                error={(
                                                    <Typography color="error" variant="body2" sx={{ p: 2 }}>
                                                        Error loading page {currentPage}.
                                                    </Typography>
                                                )}
                                                noData={(
                                                    <Typography variant="body2" sx={{ p: 2 }}>
                                                        No page data available.
                                                    </Typography>
                                                )}
                                                onRenderError={(error) => {
                                                    console.error(`Error rendering page ${currentPage}:`, error);
                                                }}
                                            />
                                        </Document>
                                    )}
                                </Box>
                            </Box>
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