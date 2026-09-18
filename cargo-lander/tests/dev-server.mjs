import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function parseArgs(argv) {
  const args = { root: '.', port: 8931 };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--root') args.root = argv[i + 1];
    else if (argv[i] === '--port') args.port = Number(argv[i + 1]);
  }
  return args;
}

const { root, port } = parseArgs(process.argv);
const rootDir = resolve(process.cwd(), root);

const server = http.createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const safePath = normalize(urlPath).replace(/^([.][.][/\\])+/, '');
    let filePath = join(rootDir, safePath);
    if (!filePath.startsWith(rootDir + sep) && filePath !== rootDir) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    if (urlPath.endsWith('/')) filePath = join(filePath, 'index.html');
    const info = await stat(filePath).catch(() => null);
    if (!info || !info.isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('server error');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`dev-server serving ${rootDir} at http://127.0.0.1:${port}/`);
});
