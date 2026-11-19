// Servidor sin dependencias: sirve la app compilada y guarda los datos en /api/state (un JSON en disco).
// Uso: node server.cjs (web)  ·  la app de escritorio (electron/main.cjs) lo arranca por dentro.
// Variables: PORT (3000), DATA_FILE (gestor-datos.json), APP_PASSWORD (si se define, pide usuario/contraseña).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.resolve(__dirname, process.env.DATA_FILE || 'gestor-datos.json');
const PASSWORD = process.env.APP_PASSWORD || '';
const MAX_BODY = 5 * 1024 * 1024;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

function readStatic(rel) {
  const file = path.join(__dirname, 'dist', rel);
  if (!file.startsWith(path.join(__dirname, 'dist'))) return null; // evita ../
  try { return fs.readFileSync(file); } catch { return null; }
}

function authorized(req) {
  if (!PASSWORD) return true;
  const [scheme, value] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Basic' || !value) return false;
  const pass = Buffer.from(value, 'base64').toString().split(':').slice(1).join(':');
  return pass === PASSWORD;
}

function saveState(req, res) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BODY) { res.writeHead(413).end(); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    if (res.writableEnded) return;
    const body = Buffer.concat(chunks).toString();
    try {
      const data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('no es un objeto');
    } catch { res.writeHead(400).end('JSON inválido'); return; }
    const tmp = DATA_FILE + '.tmp';
    try {
      fs.writeFileSync(tmp, body); // escribir y renombrar: un corte a mitad no corrompe el archivo
      fs.renameSync(tmp, DATA_FILE);
      res.writeHead(204).end();
    } catch (error) {
      console.error('No se pudo guardar', error);
      res.writeHead(500).end();
    }
  });
}

const server = http.createServer((req, res) => {
  if (!authorized(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Gestor tiempo"' }).end();
    return;
  }
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/state') {
    res.setHeader('x-gestor-api', '1');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'GET') {
      fs.readFile(DATA_FILE, (err, buf) => {
        if (err) res.writeHead(404).end();
        else res.writeHead(200, { 'Content-Type': 'application/json' }).end(buf);
      });
    } else if (req.method === 'PUT') saveState(req, res);
    else res.writeHead(405).end();
    return;
  }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  const found = readStatic(rel);
  const body = found ?? readStatic('index.html');
  if (!body) { res.writeHead(404).end('Falta compilar: npm run build'); return; }
  const type = TYPES[path.extname(found ? rel : 'index.html')] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type }).end(body);
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`Gestor tiempo en http://localhost:${PORT} · datos en ${DATA_FILE}`));
}
module.exports = server;
