import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Typography,
    Paper,
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Divider,
    Container,
    Breadcrumbs,
    TextField,
    Button,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Card,
    CardContent,
    Grid
} from '@mui/material';
import { ArrowBack, NavigateNext, Send, Description, PictureAsPdf, InsertDriveFile } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { Document, Page, pdfjs } from 'react-pdf';

// 设置PDF.js worker路径
pdfjs.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

function SearchResultDetail({ documents }) {
    const { resultId } = useParams();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [resultDetail, setResultDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeStep, setActiveStep] = useState(1); // 进度步骤
    const [messages, setMessages] = useState([]); // 聊天消息
    const [input, setInput] = useState(''); // 聊天输入
    const [chatLoading, setChatLoading] = useState(false); // 聊天加载状态
    const [pdfUrl, setPdfUrl] = useState(null); // PDF URL
    const [numPages, setNumPages] = useState(null); // PDF总页数
    const [currentPage, setCurrentPage] = useState(1); // 当前PDF页
    const messagesEndRef = useRef(null); // 用于自动滚动到最新消息

    // 模拟从API获取详细信息
    useEffect(() => {
        // 这里将来会实现实际的API调用，获取详细信息
        // 目前使用模拟数据
        const mockDetails = {
            '1': {
                id: '1',
                title: '2024年上半年进出口数据',
                content: '2024年上半年中国进出口总额达到XX万亿元，同比增长X%。其中，出口总额XX万亿元，同比增长X%；进口总额XX万亿元，同比增长X%。主要贸易伙伴方面，对欧盟、东盟、美国等主要贸易伙伴进出口均保持增长。机电产品出口增长明显，占出口总额的XX%。',
                source: '国家统计局',
                date: '2024-07-15',
                category: '经济数据'
            },
            '2': {
                id: '2',
                title: '宁德时代2024年上半年经营情况',
                content: '宁德时代2024年上半年营收达到XX亿元，净利润XX亿元，同比增长X%。公司动力电池装机量全球市场份额达到XX%，继续保持全球领先。研发投入XX亿元，同比增长X%，重点布局新一代电池技术。海外市场拓展顺利，欧洲工厂产能持续提升。',
                source: '公司财报',
                date: '2024-08-10',
                category: '公司财报'
            },
            '3': {
                id: '3',
                title: '新能源汽车产业发展情况',
                content: '2024年上半年，新能源汽车产销量分别达到XX万辆和XX万辆，同比分别增长X%和X%。其中，纯电动汽车产销分别完成XX万辆和XX万辆，同比分别增长X%和X%；插电式混合动力汽车产销分别完成XX万辆和XX万辆，同比分别增长X%和X%。新能源汽车市场渗透率达到XX%，较去年同期提高X个百分点。',
                source: '中国汽车工业协会',
                date: '2024-07-20',
                category: '行业报告'
            },
            '4': {
                id: '4',
                title: '上汽集团2024年净利润同比变动情况',
                content: '上汽集团2024年上半年净利润XX亿元，同比下降X%。营业收入XX亿元，同比下降X%。汽车销量XX万辆，同比下降X%。其中，自主品牌销量XX万辆，同比增长X%；新能源汽车销量XX万辆，同比增长X%。公司表示，将加大研发投入，加速新能源转型，预计下半年业绩将有所改善。',
                source: '公司财报',
                date: '2024-08-05',
                category: '公司财报'
            }
        };

        // 模拟API请求延迟
        setTimeout(() => {
            setResultDetail(mockDetails[resultId] || {
                id: resultId,
                title: '未找到相关信息',
                content: '抱歉，未能找到ID为' + resultId + '的详细信息。',
                source: '系统提示',
                date: new Date().toISOString().split('T')[0],
                category: '未分类'
            });
            setLoading(false);
        }, 500);
    }, [resultId]);

    // 处理侧边栏折叠/展开
    const handleToggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    // 处理聊天输入变更
    const handleInputChange = (event) => {
        setInput(event.target.value);
    };

    // 处理按键事件，支持Enter发送消息
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    // 处理发送消息
    const handleSendMessage = () => {
        if (!input.trim() || chatLoading) return;

        // 添加用户消息
        const userMessage = {
            id: Date.now(),
            type: 'user',
            content: input.trim()
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setChatLoading(true);

        // 模拟AI回复
        setTimeout(() => {
            const aiMessage = {
                id: Date.now(),
                type: 'ai',
                content: `根据检索到的资料，${resultDetail.title}显示${resultDetail.content.substring(0, 100)}...\n\n您还有其他问题吗？`
            };
            setMessages(prev => [...prev, aiMessage]);
            setChatLoading(false);
        }, 1500);
    };

    // 处理PDF文档加载成功
    const handleDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    // 处理PDF页面变更
    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= numPages) {
            setCurrentPage(newPage);
        }
    };

    // 自动滚动到最新消息
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // 模拟进度更新
    useEffect(() => {
        if (loading) {
            const timer = setInterval(() => {
                setActiveStep(prev => {
                    if (prev < 3) return prev + 1;
                    clearInterval(timer);
                    return prev;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [loading]);

    // 模拟加载PDF
    useEffect(() => {
        if (!loading && resultDetail) {
            // 这里将来会实现实际的PDF加载逻辑
            // 目前使用示例PDF
            setPdfUrl('https://arxiv.org/pdf/2303.08774.pdf');
            
            // 添加系统消息
            setMessages([{
                id: Date.now(),
                type: 'system',
                content: `已为您找到关于${resultDetail.title}的信息，您可以查看右侧PDF或直接向我提问。`
            }]);
        }
    }, [loading, resultDetail]);
    
    // 定义进度步骤
    const steps = [
        '问题分析',
        '知识检索',
        '整理答案',
        '完成'
    ];

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
                            to="/knowledge-search"
                            sx={{ mr: 2 }}
                        >
                            <ArrowBack />
                        </IconButton>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            搜索结果详情
                        </Typography>
                    </Toolbar>
                </AppBar>

                {/* 面包屑导航 */}
                <Container maxWidth="xl" sx={{ mt: 2, mb: 1 }}>
                    <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb">
                        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                            首页
                        </Link>
                        <Link to="/knowledge-search" style={{ textDecoration: 'none', color: 'inherit' }}>
                            知识检索
                        </Link>
                        <Typography color="text.primary">{loading ? '加载中...' : resultDetail?.title}</Typography>
                    </Breadcrumbs>
                </Container>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <Box sx={{ width: '60%', maxWidth: '600px' }}>
                            <Typography variant="h6" gutterBottom>正在处理您的查询...</Typography>
                            <Stepper activeStep={activeStep} alternativeLabel>
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                                <CircularProgress />
                            </Box>
                        </Box>
                    </Box>
                ) : (
                    <Grid container sx={{ flex: 1, overflow: 'hidden' }}>
                        {/* 左侧区域：查询结果和聊天 */}
                        <Grid item xs={12} md={6} sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            {/* 查询结果区域 */}
                            <Box sx={{ p: 2, flex: '0 0 auto' }}>
                                <Paper elevation={2} sx={{ p: 3, borderRadius: '12px', mb: 2 }}>
                                    <Typography variant="h5" gutterBottom>
                                        {resultDetail.title}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            来源: {resultDetail.source}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            日期: {resultDetail.date}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            分类: {resultDetail.category}
                                        </Typography>
                                    </Box>
                                    
                                    <Divider sx={{ my: 1 }} />
                                    
                                    <Typography variant="body2" paragraph sx={{ lineHeight: 1.6 }}>
                                        {resultDetail.content.substring(0, 200)}...
                                    </Typography>
                                </Paper>
                                
                                {/* 相关文档列表 */}
                                {resultDetail.relatedDocuments && resultDetail.relatedDocuments.length > 0 && (
                                    <Paper elevation={2} sx={{ p: 2, borderRadius: '12px', mb: 2 }}>
                                        <Typography variant="subtitle1" gutterBottom>
                                            相关文档
                                        </Typography>
                                        <List dense>
                                            {resultDetail.relatedDocuments.map((doc) => (
                                                <ListItem key={doc.id} button>
                                                    <ListItemIcon>
                                                        {doc.type === 'pdf' ? <PictureAsPdf color="error" /> : 
                                                         doc.type === 'docx' ? <Description color="primary" /> : 
                                                         <InsertDriveFile />}
                                                    </ListItemIcon>
                                                    <ListItemText 
                                                        primary={doc.title} 
                                                        secondary={doc.type.toUpperCase()} 
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </Paper>
                                )}
                            </Box>
                            
                            {/* 聊天区域 */}
                            <Box sx={{ 
                                flex: 1, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                p: 2, 
                                pt: 0,
                                overflow: 'hidden'
                            }}>
                                <Paper elevation={3} sx={{ 
                                    p: 2, 
                                    borderRadius: '12px', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    height: '100%',
                                    overflow: 'hidden'
                                }}>
                                    <Typography variant="subtitle1" gutterBottom>
                                        AI 助手
                                    </Typography>
                                    
                                    {/* 消息列表 */}
                                    <Box sx={{ 
                                        flex: 1, 
                                        overflow: 'auto', 
                                        mb: 2,
                                        p: 1
                                    }}>
                                        {messages.map((message) => (
                                            <Box 
                                                key={message.id} 
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                                                    mb: 2
                                                }}
                                            >
                                                <Paper 
                                                    elevation={1} 
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: '12px',
                                                        maxWidth: '80%',
                                                        backgroundColor: message.type === 'user' ? '#e3f2fd' : 
                                                                        message.type === 'system' ? '#f5f5f5' : '#f1f8e9'
                                                    }}
                                                >
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                        {message.content}
                                                    </Typography>
                                                </Paper>
                                            </Box>
                                        ))}
                                        <div ref={messagesEndRef} />
                                    </Box>
                                    
                                    {/* 输入区域 */}
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            placeholder="输入您的问题..."
                                            value={input}
                                            onChange={handleInputChange}
                                            onKeyDown={handleKeyDown}
                                            multiline
                                            maxRows={3}
                                            size="small"
                                            disabled={chatLoading}
                                            sx={{ mr: 1 }}
                                        />
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            endIcon={chatLoading ? <CircularProgress size={20} color="inherit" /> : <Send />}
                                            onClick={handleSendMessage}
                                            disabled={!input.trim() || chatLoading}
                                        >
                                            发送
                                        </Button>
                                    </Box>
                                </Paper>
                            </Box>
                        </Grid>
                        
                        {/* 右侧区域：PDF预览 */}
                        <Grid item xs={12} md={6} sx={{ height: '100%', overflow: 'hidden', p: 2, display: 'flex', flexDirection: 'column' }}>
                            <Paper elevation={3} sx={{ 
                                p: 2, 
                                borderRadius: '12px', 
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}>
                                <Typography variant="subtitle1" gutterBottom>
                                    文档预览
                                </Typography>
                                
                                <Box sx={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    overflow: 'auto',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '4px',
                                    backgroundColor: '#f5f5f5'
                                }}>
                                    {pdfUrl ? (
                                        <Document
                                            file={pdfUrl}
                                            onLoadSuccess={handleDocumentLoadSuccess}
                                            options={{
                                                cMapUrl: 'https://unpkg.com/pdfjs-dist@3.4.120/cmaps/',
                                                cMapPacked: true,
                                            }}
                                            loading={<CircularProgress />}
                                            error={<Typography color="error">PDF加载失败，请稍后再试</Typography>}
                                        >
                                            <Page 
                                                pageNumber={currentPage} 
                                                width={450}
                                                renderTextLayer={true}
                                                renderAnnotationLayer={true}
                                                renderInteractiveForms={false}
                                                loading={<CircularProgress size={40} />}
                                            />
                                        </Document>
                                    ) : (
                                        <Box sx={{ textAlign: 'center' }}>
                                            <Typography variant="body1" color="text.secondary" gutterBottom>
                                                暂无可预览的文档
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                请在左侧选择相关文档查看
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                                
                                {/* PDF控制区域 */}
                                {pdfUrl && numPages && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage <= 1}
                                        >
                                            上一页
                                        </Button>
                                        <Typography variant="body2" sx={{ mx: 2 }}>
                                            {currentPage} / {numPages}
                                        </Typography>
                                        <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage >= numPages}
                                        >
                                            下一页
                                        </Button>
                                    </Box>
                                )}
                            </Paper>
                        </Grid>
                    </Grid>
                )}
            </div>
        </div>
    );
}

export default SearchResultDetail;