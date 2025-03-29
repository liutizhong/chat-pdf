import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Button,
    Typography,
    Paper,
    LinearProgress,
    Alert,
    IconButton,
    AppBar,
    Toolbar
} from '@mui/material';
import { CloudUpload, ArrowBack } from '@mui/icons-material';
import apiService from '../services/apiService';

function UploadPage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            setSelectedFile(file);
            setError(null);
        } else {
            setSelectedFile(null);
            setError('Please select a valid PDF file.');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setUploadProgress(0);
        setError(null);

        try {
            // Use our apiService instead of direct axios call
            await apiService.uploadPdf(selectedFile, (progress) => {
                setUploadProgress(progress);
            });

            setSuccess(true);
            // After successful upload, wait 2 seconds before redirecting
            setTimeout(() => {
                navigate('/');
            }, 2000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'An error occurred while uploading the file.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="App">
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        component={Link}
                        to="/"
                        sx={{ mr: 2 }}
                    >
                        <ArrowBack />
                    </IconButton>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Upload PDF
                    </Typography>
                </Toolbar>
            </AppBar>

            <div className="upload-container">
                <Paper className="upload-form" elevation={3}>
                    <Typography variant="h5" gutterBottom>
                        Upload a PDF Document
                    </Typography>

                    <Typography variant="body2" color="textSecondary" paragraph>
                        The PDF will be vectorized and stored in the Weaviate database for chat-based querying.
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ my: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ my: 2 }}>
                            File uploaded successfully! Redirecting...
                        </Alert>
                    )}

                    <input
                        type="file"
                        accept=".pdf"
                        id="pdf-upload"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                        disabled={uploading}
                    />

                    <label htmlFor="pdf-upload">
                        <Button
                            variant="outlined"
                            component="span"
                            startIcon={<CloudUpload />}
                            fullWidth
                            sx={{ mb: 2 }}
                            disabled={uploading}
                        >
                            Select PDF File
                        </Button>
                    </label>

                    {selectedFile && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Selected file: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                        </Typography>
                    )}

                    {uploading && (
                        <div style={{ marginBottom: '20px' }}>
                            <LinearProgress
                                variant="determinate"
                                value={uploadProgress}
                                sx={{ mb: 1 }}
                            />
                            <Typography variant="caption" align="center" display="block">
                                {uploadProgress}% Uploaded
                            </Typography>
                        </div>
                    )}

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={!selectedFile || uploading}
                        fullWidth
                    >
                        {uploading ? 'Uploading...' : 'Upload PDF'}
                    </Button>
                </Paper>
            </div>
        </div>
    );
}

export default UploadPage;