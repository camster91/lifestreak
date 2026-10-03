// @vitest-environment node
import { afterEach, expect, it } from 'vitest';
import { createServer, request } from 'node:http';
import { once } from 'node:events';
import devProxyModule from '../../dev-proxy.cjs';

const cleanup = [];
afterEach(async () => {
  for (const close of cleanup.reverse()) await close();
  cleanup.length = 0;
});

async function listen(server) {
  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  cleanup.push(() => {
    for (const socket of sockets) socket.destroy();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function fixture(upstream) {
  const target = await listen(upstream);
  const proxy = devProxyModule.createDevProxy(target);
  const server = createServer(proxy.middleware);
  proxy.attach(server);
  const origin = await listen(server);
  cleanup.push(() => proxy.close());
  return { origin, target };
}

it('forwards Vite paths, query strings, host and response headers', async () => {
  const upstream = createServer((req, res) => {
    res.setHeader('X-Fixture', 'vite');
    res.end(JSON.stringify({ url: req.url, host: req.headers.host }));
  });
  const { origin, target } = await fixture(upstream);
  const response = await fetch(`${origin}/assets/app.js?revision=synthetic`);
  expect(response.status).toBe(200);
  expect(response.headers.get('x-fixture')).toBe('vite');
  expect(await response.json()).toEqual({
    url: '/assets/app.js?revision=synthetic',
    host: new URL(target).host,
  });
});

it('streams an unparsed request body to the development server', async () => {
  const upstream = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => res.end(body));
  });
  const { origin } = await fixture(upstream);
  const response = await fetch(`${origin}/fixture`, { method: 'POST', body: 'synthetic body' });
  expect(await response.text()).toBe('synthetic body');
});

it('forwards hot-reload WebSocket upgrades and data', async () => {
  const upstream = createServer();
  upstream.on('upgrade', (_req, socket) => {
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n'
    );
    socket.on('data', (data) => socket.write(data));
  });
  const { origin } = await fixture(upstream);
  await new Promise((resolve, reject) => {
    const req = request(`${origin}/hmr`, {
      headers: { Connection: 'Upgrade', Upgrade: 'websocket' },
    });
    req.on('error', reject);
    req.on('upgrade', (response, socket) => {
      expect(response.statusCode).toBe(101);
      socket.once('data', (data) => {
        expect(data.toString()).toBe('synthetic-hmr');
        socket.destroy();
        resolve();
      });
      socket.write('synthetic-hmr');
    });
    req.end();
  });
});

it('returns 502 when the Vite upstream is unavailable', async () => {
  const upstream = createServer();
  const target = await listen(upstream);
  await new Promise((resolve) => upstream.close(resolve));
  cleanup.pop();
  const proxy = devProxyModule.createDevProxy(target);
  cleanup.push(() => proxy.close());
  const origin = await listen(createServer(proxy.middleware));
  const response = await fetch(`${origin}/fixture`);
  expect(response.status).toBe(502);
  expect(await response.text()).toBe('Development server unavailable');
});
