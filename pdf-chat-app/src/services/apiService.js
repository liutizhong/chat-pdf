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
    sendChatMessage: async (documentId, query) => {
        try {
            const response = await axios.post(`/api/chat`, {
                document_id: documentId,
                query: query
            });
            return response.data;
        } catch (error) {
            console.error('Error sending chat message:', error);
            throw error;
        }
    }
};

export default apiService;