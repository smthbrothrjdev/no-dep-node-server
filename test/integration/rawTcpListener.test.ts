import assert from 'node:assert/strict';
import net from 'node:net';
import { once } from 'node:events';
import test from 'node:test';
import { join } from 'node:path';
import { spawnServer } from '../helpers/serverProcess';

const { healthz } = require(join(process.cwd(), 'dist/endpoints/res.js')) as { healthz: unknown };

async function connect(port: number): Promise<net.Socket> {
  const socket = net.createConnection({ host: '127.0.0.1', port });
  await once(socket, 'connect');
  return socket;
}

async function readUntilClose(socket: net.Socket): Promise<string> {
  let response = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk: string) => { response += chunk; });
  await once(socket, 'close');
  return response;
}

test('raw TCP listener returns the health response over HTTP/1.1', async (t) => {
  const server = await spawnServer();
  t.after(() => server.stop());

  const socket = await connect(server.port);
  socket.write('GET /healthz HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');

  const response = await readUntilClose(socket);

  assert.ok(response.startsWith('HTTP/1.1 200 OK'), response);
  assert.match(response, /^Content-Type: application\/json; charset=utf-8\r$/im);
  assert.match(response, new RegExp(`${JSON.stringify(healthz).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
});

test('SIGTERM gracefully closes an open raw TCP socket and exits', async (t) => {
  const server = await spawnServer();
  t.after(() => server.stop());

  const socket = await connect(server.port);
  const socketClosed = once(socket, 'close');
  const processExited = once(server.child, 'exit') as Promise<[number | null, NodeJS.Signals | null]>;

  server.child.kill('SIGTERM');

  const [exit] = await Promise.all([processExited, socketClosed]);
  const [code, signal] = exit;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.equal(socket.destroyed, true);
});
