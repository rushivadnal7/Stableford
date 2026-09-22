/**
 * A minimal static file server used only by build-time scripts (the poster renderer, and anything else
 * that needs to hand a real browser some files). Never runs in production.
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };

/**
 * Serves `root` at `/`, plus any `extra` virtual files (path -> { body, type }) that do not exist on disk.
 * Picks its own free port. Returns `{ url, close }`.
 */
export function start(root, extra = {}) {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    const virtual = extra[url];
    if (virtual) {
      res.writeHead(200, { 'content-type': virtual.type, 'cache-control': 'no-store' });
      res.end(virtual.body);
      return;
    }
    const file = path.join(root, url);
    if (!file.startsWith(path.resolve(root))) {
      res.writeHead(403).end();
      return;
    }
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    } catch {
      res.writeHead(404).end(`not found: ${url}`);
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}
