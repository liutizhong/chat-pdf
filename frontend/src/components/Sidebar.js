import React, { useState } from 'react';
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
    Button,
    IconButton,
    Drawer,
    Collapse
} from '@mui/material';
import { Description, CloudUpload, Home, ChevronLeft, ChevronRight } from '@mui/icons-material';

function Sidebar({ documents, selectedDocument, onDocumentSelect, collapsed, onToggleCollapse }) {
    return (
        <Paper 
            elevation={0} 
            sx={{ 
                height: '100%',
                
                display: 'flex',
                flexDirection: 'column',
                width: collapsed ? '64px' : '240px',
                transition: 'width 0.3s ease'
            }}
        >
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {!collapsed && (
                    <Typography variant="h6" component="div">
                        文档列表
                    </Typography>
                )}
                <IconButton onClick={onToggleCollapse}>
                    {collapsed ? <ChevronRight /> : <ChevronLeft />}
                </IconButton>
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
                    sx={{
                        minWidth: collapsed ? 'auto' : undefined,
                        px: collapsed ? 1 : undefined,
                        justifyContent: collapsed ? 'center' : undefined
                    }}
                >
                    {!collapsed && '上传PDF'}
                </Button>
                <Button
                    component={Link}
                    to="/"
                    variant="outlined"
                    startIcon={<Home />}
                    fullWidth
                    sx={{
                        mt: 1,
                        minWidth: collapsed ? 'auto' : undefined,
                        px: collapsed ? 1 : undefined,
                        justifyContent: collapsed ? 'center' : undefined
                    }}
                >
                    {!collapsed && '返回首页'}
                </Button>
            </Box>
        </Paper>
    );
}

export default Sidebar;