'use strict';

const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const test = require('node:test');
const { healthz } = require('../../dist/endpoints/res.js');
const { spawnServer } = require('../helpers/serverProcess.js');

function connect(port) {
  const socket = net.createConnection({ host: '127.0.0.1', port });
  return once(socket, 'connect').then(() => socket);
}

async function readUntilClose(socket) {
  let response = '';
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => { response += chunk; });
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
  const processExited = once(server.child, 'exit');

  server.child.kill('SIGTERM');

  const [exit] = await Promise.all([processExited, socketClosed]);
  const [code, signal] = exit;
  assert.equal(code, 0);
  assert.equal(signal, null);
  assert.equal(socket.destroyed, true);
});
