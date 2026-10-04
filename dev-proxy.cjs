const httpProxy = require('http-proxy');

// All remaining development routes go to Vite; no glob matcher is needed.
function createDevProxy(target) {
  const proxy = httpProxy.createProxyServer({ target, changeOrigin: true, ws: true });
  proxy.on('error', (_error, _request, response) => {
    if (typeof response.writeHead === 'function') {
      if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'text/plain' });
      response.end('Development server unavailable');
    } else {
      response.destroy();
    }
  });
  return {
    middleware: (request, response) => proxy.web(request, response),
    attach: (server) => server.on('upgrade', (request, socket, head) => proxy.ws(request, socket, head)),
    close: () => proxy.close(),
  };
}

module.exports = { createDevProxy };
