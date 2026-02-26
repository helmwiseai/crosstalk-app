import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const port = Number(process.env.WEB_PORT || 5173);
const apiBase = process.env.CROSSTALK_API_URL || 'http://127.0.0.1:3001';

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': contentType });
  res.end(body);
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) return send(res, 404, 'Not found');
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.html'
    ? 'text/html; charset=utf-8'
    : ext === '.js'
      ? 'application/javascript; charset=utf-8'
      : ext === '.css'
        ? 'text/css; charset=utf-8'
        : 'application/octet-stream';

  send(res, 200, fs.readFileSync(filePath), type);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

async function handleApiProxy(req, res, pathname) {
  const upstream = `${apiBase}${pathname.replace(/^\/api/, '')}`;
  const body = ['POST', 'PUT', 'PATCH'].includes(req.method || '') ? await readBody(req) : undefined;

  const up = await fetch(upstream, {
    method: req.method,
    headers: {
      'content-type': req.headers['content-type'] || 'application/json'
    },
    body
  });

  const text = await up.text();
  res.writeHead(up.status, { 'content-type': up.headers.get('content-type') || 'application/json' });
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) return send(res, 400, 'Bad request');
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      return await handleApiProxy(req, res, url.pathname);
    }

    if (url.pathname === '/health') {
      return send(res, 200, JSON.stringify({ ok: true, service: 'crosstalk-web', apiBase }), 'application/json');
    }

    if (url.pathname === '/config') {
      return send(res, 200, JSON.stringify({ apiBase }), 'application/json');
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveFile(res, path.join(publicDir, 'index.html'));
    }

    if (url.pathname === '/app.js') {
      return serveFile(res, path.join(publicDir, 'app.js'));
    }

    if (url.pathname === '/styles.css') {
      return serveFile(res, path.join(publicDir, 'styles.css'));
    }

    return send(res, 404, 'Not found');
  } catch (e) {
    return send(res, 500, `web proxy error: ${e.message}`);
  }
});

server.listen(port, () => {
  console.log(`[crosstalk-web] listening on :${port} (api=${apiBase})`);
});
