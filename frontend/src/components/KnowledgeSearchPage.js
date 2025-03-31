import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Typography,
    Paper,
    Box,
    TextField,
    Button,
    AppBar,
    Toolbar,
    IconButton,
    ToggleButtonGroup,
    ToggleButton,
    Card,
    CardContent,
    CardActionArea,
    Divider
} from '@mui/material';
import { ArrowBack, Search, ArrowForward } from '@mui/icons-material';
import Sidebar from './Sidebar';

function KnowledgeSearchPage({ documents }) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchScope, setSearchScope] = useState('all');
    const [searchResults, setSearchResults] = useState([]);
    const [charactersCount, setCharactersCount] = useState(0);

    // 处理搜索范围变更
    const handleScopeChange = (event, newScope) => {
        if (newScope !== null) {
            setSearchScope(newScope);
        }
    };

    // 处理搜索输入变更
    const handleSearchInputChange = (event) => {
        setSearchQuery(event.target.value);
        setCharactersCount(event.target.value.length);
    };

    // 处理搜索提交
    const handleSearch = () => {
        // 这里将来会实现实际的搜索逻辑，连接到后端API
        // 目前使用模拟数据
        const mockResults = [
            {
                id: '1',
                title: '2024年上半年进出口数据',
                content: '2024年上半年中国进出口总额达到XX万亿元，同比增长X%...',
            },
            {
                id: '2',
                title: '宁德时代2024年上半年经营情况',
                content: '宁德时代2024年上半年营收达到XX亿元，净利润XX亿元...',
            },
            {
                id: '3',
                title: '新能源汽车产业发展情况',
                content: '2024年上半年，新能源汽车产销量分别达到XX万辆和XX万辆...',
            },
            {
                id: '4',
                title: '上汽集团2024年净利润同比变动情况',
                content: '上汽集团2024年上半年净利润XX亿元，同比下降X%...',
            },
        ];
        setSearchResults(mockResults);
    };

    // 处理按键事件，支持Shift+Enter提交搜索
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && event.shiftKey) {
            handleSearch();
        }
    };

    // 处理侧边栏折叠/展开
    const handleToggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            {/* 侧边栏 */}
            <Sidebar
                documents={documents}
                selectedDocument={''}
                onDocumentSelect={() => {}}
                collapsed={sidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
            />

            {/* 主内容区 */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* 顶部导航栏 */}
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
                            知识检索
                        </Typography>
                    </Toolbar>
                </AppBar>

                {/* 搜索区域 */}
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                        知识库检索
                    </Typography>

                    <Paper 
                        elevation={3} 
                        sx={{ 
                            p: 3, 
                            width: '100%', 
                            maxWidth: '800px',
                            mb: 4,
                            borderRadius: '12px'
                        }}
                    >
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="有问题尽管问我，Shift + Enter 换行"
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            onKeyDown={handleKeyDown}
                            multiline
                            rows={2}
                            sx={{ mb: 2 }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <ToggleButtonGroup
                                value={searchScope}
                                exclusive
                                onChange={handleScopeChange}
                                aria-label="search scope"
                                size="small"
                            >
                                <ToggleButton value="all" aria-label="all">
                                    全局
                                </ToggleButton>
                                <ToggleButton value="public" aria-label="public">
                                    公开知识库
                                </ToggleButton>
                                <ToggleButton value="personal" aria-label="personal">
                                    个人知识库
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                                    {charactersCount}/300
                                </Typography>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    endIcon={<Search />}
                                    onClick={handleSearch}
                                    disabled={!searchQuery.trim()}
                                >
                                    搜索
                                </Button>
                            </Box>
                        </Box>
                    </Paper>

                    {/* 搜索结果区域 */}
                    <Box sx={{ width: '100%', maxWidth: '800px', overflow: 'auto', flex: 1 }}>
                        {searchResults.map((result) => (
                            <Card key={result.id} sx={{ mb: 2, borderRadius: '8px' }}>
                                <CardActionArea component={Link} to={`/search-result/${result.id}`}>
                                    <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="h6" component="div">
                                                {result.title}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {result.content}
                                            </Typography>
                                        </Box>
                                        <ArrowForward color="action" />
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        ))}
                    </Box>
                </Box>
            </div>
        </div>
    );
}

export default KnowledgeSearchPage;