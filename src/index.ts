// src/index.ts
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { createReadStream, promises as fs } from 'fs';
import { join, extname, normalize, resolve, relative, isAbsolute } from 'path';
import { parseFlags } from './utils/cliFlags';
import { enableMetrics } from './perf/metrics';
import type { Socket } from 'net';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const PUBLIC_DIR = join(__dirname, 'public');

// parsing flags logic
const flags = parseFlags();

let metrics: ReturnType<typeof enableMetrics> | null = null;
if (flags.metrics) {
	metrics = enableMetrics({
		sampleMs: flags.metricsSample,
		thresholdMs: flags.metricsThreshold,
	});
}
/** Minimal MIME map */
function guessMime(ext: string): string {
	const map: Record<string, string> = {
		html: 'text/html; charset=utf-8',
		css: 'text/css; charset=utf-8',
		js: 'application/javascript; charset=utf-8',
		mjs: 'application/javascript; charset=utf-8',
		json: 'application/json; charset=utf-8',
		svg: 'image/svg+xml',
		png: 'image/png',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		gif: 'image/gif',
		webp: 'image/webp',
		ico: 'image/x-icon',
		txt: 'text/plain; charset=utf-8'
	};
	return map[ext] || 'application/octet-stream';
}

/** Ensure child is inside parent (prevents path traversal) */
function isInside(parent: string, child: string): boolean {
	const rel = relative(parent, child);
	return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/** Serve files under dist/public; returns true if handled */
async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
	if (!req.url) return false;
	if (req.method !== 'GET' && req.method !== 'HEAD') return false;

	// Strip query/hash and decode
	const rawPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
	const normalized = normalize(rawPath === '/' ? '/index.html' : rawPath);

	// Build and validate the absolute file path
	let filePath = resolve(join(PUBLIC_DIR, normalized));
	if (!isInside(PUBLIC_DIR, filePath)) return false;

	try {
		let stats = await fs.stat(filePath);
		if (stats.isDirectory()) {
			filePath = resolve(join(filePath, 'index.html'));
			if (!isInside(PUBLIC_DIR, filePath)) return false;
			stats = await fs.stat(filePath);
		}

		// Conditional GET support (If-Modified-Since)
		const ims = req.headers['if-modified-since'];
		if (ims) {
			const imsTime = new Date(ims).getTime();
			if (!Number.isNaN(imsTime) && stats.mtime.getTime() <= imsTime) {
				res.writeHead(304, {
					'Last-Modified': stats.mtime.toUTCString(),
					'Cache-Control': 'public, max-age=300',
					'X-Content-Type-Options': 'nosniff'
				});
				res.end();
				return true;
			}
		}

		const ext = extname(filePath).slice(1).toLowerCase();
		const headers = {
			'Content-Type': guessMime(ext),
			'Content-Length': String(stats.size),
			'Last-Modified': stats.mtime.toUTCString(),
			'Cache-Control': 'public, max-age=300',
			'X-Content-Type-Options': 'nosniff'
		};

		if (req.method === 'HEAD') {
			res.writeHead(200, headers);
			res.end();
			return true;
		}

		res.writeHead(200, headers);
		const stream = createReadStream(filePath);
		stream.on('error', () => {
			if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
			res.end('Internal Server Error\n');
		});
		stream.pipe(res);
		return true;
	} catch {
		return false; // let the router handle (likely 404)
	}
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
	//metrics hook in
	res.on('finish', () => metrics?.incr());

	// Try static files first
	if (await serveStatic(req, res)) return;

	// Example API route (optional)
	if (req.method === 'GET' && req.url === '/healthz') {
		res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
		res.end('ok\n');
		return;
	}

	// Fallback 404
	res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
	res.end('Not Found\n');
});

server.listen(PORT, () => {
	console.log(`🚀 Server listening on http://localhost:${PORT}`);
});

const sockets = new Set<Socket>();
server.on('connection', (sock: Socket) => {
	sockets.add(sock);
	sock.on('close', () => sockets.delete(sock));
});

// helpful defaults to avoid long keeps
server.keepAliveTimeout = 5000;   // 5s
server.headersTimeout = 7000;   // 7s

function shutdown(reason = 'SIGTERM') {
	console.log(`\nShutting down (${reason})...`);
	// stop new work
	server.close(err => {
		if (err) {
			console.error('Error during server.close:', err);
		}
		// kill any stragglers
		for (const s of sockets) s.destroy();
		metrics?.disable?.();
		process.exit(err ? 1 : 0);
	});

	// optional: short deadline for active reqs, then destroy
	const FORCE_EXIT_MS = 5000;
	setTimeout(() => {
		console.warn(`Force exit after ${FORCE_EXIT_MS}ms`);
		for (const s of sockets) s.destroy();
		metrics?.disable?.();
		process.exit(1);
	}, FORCE_EXIT_MS).unref();
}

// make it impossible to forget the ()
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));



