import axios from 'axios';

// When using the proxy setup, we don't need to specify the full URL
// The proxy will forward requests to the appropriate backend
const apiService = {
    // Get list of all available documents
    getDocuments: async () => {
        try {
            const response = await axios.get(`/api/documents`);
            return response.data;
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    },

    // Get a specific document's PDF
    getDocumentPdf: async (documentId) => {
        try {
            const response = await axios.get(`/api/documents/${documentId}/pdf`, {
                responseType: 'blob'
            });
            return URL.createObjectURL(response.data);
        } catch (error) {
            console.error('Error fetching PDF:', error);
            throw error;
        }
    },

    // Upload a new PDF
    uploadPdf: async (file, onUploadProgress) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    if (onUploadProgress) {
                        onUploadProgress(percentCompleted);
                    }
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading PDF:', error);
            throw error;
        }
    },

    // Send a chat message and get response
    // sendChatMessage: async (documentId, query) => {
    //     try {
    //         // Add timeout to prevent hanging requests
    //         const response = await axios.post(
    //             `/api/chat`,
    //             {
    //                 document_id: documentId,
    //                 query: query
    //             },
    //             {
    //                 timeout: 30000, // 30 second timeout
    //                 headers: {
    //                     'Content-Type': 'application/json'
    //                 }
    //             }
    //         );
    //         return response.data;
    //     } catch (error) {
    //         console.error('Error sending chat message:', error);
    //         // Provide more specific error information
    //         if (error.response) {
    //             // The request was made and the server responded with a status code
    //             // that falls out of the range of 2xx
    //             console.error('Response data:', error.response.data);
    //             console.error('Response status:', error.response.status);
    //         } else if (error.request) {
    //             // The request was made but no response was received
    //             console.error('No response received:', error.request);
    //         }
    //         throw error;
    //     }
    // }
    // Send a chat message and get response
    sendChatMessage: async (documentId, query) => {
        try {
            // Implement retry mechanism
            const maxRetries = 2;
            let retries = 0;
            let lastError = null;

            while (retries <= maxRetries) {
                try {
                    // Increased timeout and added signal to allow for cancelation
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout

                    const response = await axios.post(
                        `/api/chat`,
                        {
                            document_id: documentId,
                            query: query
                        },
                        {
                            signal: controller.signal,
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    clearTimeout(timeoutId);
                    return response.data;
                } catch (error) {
                    lastError = error;

                    // Don't retry if it's a 4xx error (client error)
                    if (error.response && error.response.status >= 400 && error.response.status < 500) {
                        throw error;
                    }

                    // If it's an abort error (timeout) or server error, retry
                    retries++;
                    if (retries <= maxRetries) {
                        console.log(`Retrying request (${retries}/${maxRetries})...`);
                        // Wait a bit before retrying (exponential backoff)
                        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                    }
                }
            }

            // If we've exhausted all retries, throw the last error
            throw lastError;
        } catch (error) {
            console.error('Error sending chat message:', error);

            // Provide more specific error information for debugging
            if (error.response) {
                console.error('Response data:', error.response.data);
                console.error('Response status:', error.response.status);
            } else if (error.request) {
                console.error('No response received:', error.request);
            }

            // For timeout errors, provide a specific message
            if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
                error.customMessage = 'The request timed out. The server might be busy processing your question.';
            } else if (error.response && error.response.status >= 500) {
                error.customMessage = 'The server encountered an error. Please try again later.';
            }

            throw error;
        }
    }
};

export default apiService;