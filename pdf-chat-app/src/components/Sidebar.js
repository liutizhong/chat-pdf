import React from 'react';
import { Link } from 'react-router-dom';
import {
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Box,
    Paper,
    Button
} from '@mui/material';
import { Description, CloudUpload, Home } from '@mui/icons-material';

function Sidebar({ documents, selectedDocument, onDocumentSelect }) {
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                height: '100%',
                borderRight: '1px solid #e0e0e0',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                <Typography variant="h6" component="div">
                    文档列表
                </Typography>
            </Box>
            
            <List sx={{ flexGrow: 1, overflow: 'auto' }}>
                {documents && documents.length > 0 ? (
                    documents.map((doc) => (
                        <ListItem 
                            button 
                            key={doc.id} 
                            selected={selectedDocument === doc.id}
                            onClick={() => onDocumentSelect(doc.id)}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: '#e3f2fd',
                                    '&:hover': {
                                        backgroundColor: '#bbdefb',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon>
                                <Description color={selectedDocument === doc.id ? "primary" : "inherit"} />
                            </ListItemIcon>
                            <ListItemText 
                                primary={doc.filename} 
                                primaryTypographyProps={{
                                    noWrap: true,
                                    title: doc.filename
                                }}
                            />
                        </ListItem>
                    ))
                ) : (
                    <ListItem>
                        <ListItemText primary="无文档" secondary="请上传PDF文件" />
                    </ListItem>
                )}
            </List>
            
            <Divider />
            <Box sx={{ p: 2 }}>
                <Button
                    component={Link}
                    to="/upload"
                    variant="contained"
                    startIcon={<CloudUpload />}
                    fullWidth
                >
                    上传PDF
                </Button>
                <Button
                    component={Link}
                    to="/"
                    variant="outlined"
                    startIcon={<Home />}
                    fullWidth
                    sx={{ mt: 1 }}
                >
                    返回首页
                </Button>
            </Box>
        </Paper>
    );
}

export default Sidebar;