'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { join } = require('node:path');

async function getAvailablePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : undefined;
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  if (!port) {
    throw new Error('Unable to allocate an available port');
  }

  return port;
}

function requestHealth(port) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/healthz', timeout: 250 }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });

    req.on('timeout', () => req.destroy(new Error('Timed out waiting for /healthz')));
    req.on('error', reject);
  });
}

async function waitForHealth(port, { timeoutMs = 5000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;

  while (Date.now() < deadline) {
    try {
      if ((await requestHealth(port)) === 200) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`Server did not become healthy within ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ''}`);
}

async function spawnServer({ port } = {}) {
  const serverPort = port ?? await getAvailablePort();
  const child = spawn(process.execPath, [join(process.cwd(), 'dist/index.js')], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(serverPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const output = { stdout: '', stderr: '' };
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => { output.stdout += chunk; });
  child.stderr.on('data', (chunk) => { output.stderr += chunk; });

  let exited = false;
  child.once('exit', () => { exited = true; });

  try {
    await waitForHealth(serverPort);
  } catch (error) {
    child.kill('SIGTERM');
    throw new Error(`${error.message}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`);
  }

  async function stop(signal = 'SIGTERM') {
    if (exited) return;
    child.kill(signal);
    await once(child, 'exit');
  }

  return { child, port: serverPort, output, stop };
}

module.exports = {
  getAvailablePort,
  spawnServer,
};
