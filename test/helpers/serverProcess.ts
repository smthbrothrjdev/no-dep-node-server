import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { join } from 'node:path';

interface ServerOutput {
  stdout: string;
  stderr: string;
}

interface SpawnedServer {
  child: ReturnType<typeof spawn>;
  port: number;
  output: ServerOutput;
  stop: (signal?: NodeJS.Signals) => Promise<void>;
}

export async function getAvailablePort(): Promise<number> {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : undefined;
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  if (!port) {
    throw new Error('Unable to allocate an available port');
  }

  return port;
}

function requestHealth(port: number): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/healthz', timeout: 250 }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('timeout', () => req.destroy(new Error('Timed out waiting for /healthz')));
    req.on('error', reject);
  });
}

async function waitForHealth(port: number, { timeoutMs = 5000 }: { timeoutMs?: number } = {}): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: Error | undefined;

  while (Date.now() < deadline) {
    try {
      if ((await requestHealth(port)) === 200) return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Server did not become healthy within ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`);
}

export async function spawnServer({ port }: { port?: number } = {}): Promise<SpawnedServer> {
  const serverPort = port ?? await getAvailablePort();
  const child = spawn(process.execPath, [join(process.cwd(), 'dist/index.js')], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(serverPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const output: ServerOutput = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => { output.stdout += chunk; });
  child.stderr.on('data', (chunk: string) => { output.stderr += chunk; });

  let exited = false;
  child.once('exit', () => { exited = true; });

  try {
    await waitForHealth(serverPort);
  } catch (error) {
    child.kill('SIGTERM');
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`);
  }

  async function stop(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    if (exited) return;
    child.kill(signal);
    await once(child, 'exit');
  }

  return { child, port: serverPort, output, stop };
}
