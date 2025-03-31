import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import './App.css';
import MainPage from './components/MainPage';
import UploadPage from './components/UploadPage';
import KnowledgeSearchPage from './components/KnowledgeSearchPage';
import SearchResultDetail from './components/SearchResultDetail';
import apiService from './services/apiService';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
        background: {
            default: '#f5f5f5',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
});

function App() {
    const [documents, setDocuments] = useState([]);

    useEffect(() => {
        // Fetch the list of available documents from the backend
        const fetchDocuments = async () => {
            try {
                const data = await apiService.getDocuments();
                setDocuments(data);
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();
    }, []);

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<MainPage documents={documents} />} />
                        <Route path="/upload" element={<UploadPage />} />
                        <Route path="/knowledge-search" element={<KnowledgeSearchPage documents={documents} />} />
                        <Route path="/search-result/:resultId" element={<SearchResultDetail documents={documents} />} />
                    </Routes>
                </div>
            </Router>
        </ThemeProvider>
    );
}

export default App;