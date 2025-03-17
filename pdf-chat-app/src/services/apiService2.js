import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const apiService = {
    // Get list of all available documents
    getDocuments: async () => {
        try {
            const response = await axios.get(`${API_URL}/api/documents`);
            console.info('1231243');
            return response.data;
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    },

    // Get a specific document's PDF
    getDocumentPdf: async (documentId) => {
        try {
            const response = await axios.get(`${API_URL}/api/documents/${documentId}/pdf`, {
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
            const response = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress
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
            const response = await axios.post(`${API_URL}/api/chat`, {
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