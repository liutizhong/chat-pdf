const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
            pathRewrite: {
                '^/api': '/api', // No rewrite needed in this case
            },
            onProxyReq: (proxyReq, req, res) => {
                // Log proxy requests for debugging
                console.log(`Proxying ${req.method} request to: ${proxyReq.path}`);
            },
            onError: (err, req, res) => {
                console.error('Proxy error:', err);
                res.status(500).send('Proxy Error');
            }
        })
    );
};