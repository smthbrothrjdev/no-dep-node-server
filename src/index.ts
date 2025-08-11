import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createReadStream, promises as fsPromises } from 'fs';
import { join, extname } from 'path';

const PUBLIC_DIR = join(__dirname, 'public');

function serveStatic(req: IncomingMessage, res: ServerResponse): boolean {
	if (!req.url) return false;
	// only handle under /public or naked /
	let filePath = req.url === '/'
		? join(PUBLIC_DIR, 'index.html')
		: join(PUBLIC_DIR, req.url);

	// prevent path-traversal
	if (!filePath.startsWith(PUBLIC_DIR)) return false;

	return fsPromises.stat(filePath)
		.then(stats => {
			if (stats.isDirectory()) {
				filePath = join(filePath, 'index.html');
				return fsPromises.stat(filePath);
			}
			return stats;
		})
		.then(() => {
			const ext = extname(filePath).slice(1);
			const mime = {
				html: 'text/html',
				css: 'text/css',
				js: 'application/javascript',
				png: 'image/png',
				jpg: 'image/jpeg',
				svg: 'image/svg+xml',
			}[ext] || 'application/octet-stream';

			res.writeHead(200, { 'Content-Type': mime });
			createReadStream(filePath).pipe(res);
			return true;
		})
		.catch(() => false);
}

const server = createServer((req, res) => {
	serveStatic(req, res)
		.then(handed => {
			if (handed) return;
			// ... your other routing logic here ...
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found\n');
		});
});

// ... listen as before ...

