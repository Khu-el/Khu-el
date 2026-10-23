import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:https';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { makeNodeFetch } from '../src/browse/nodeFetch.ts';

function cert() {
  const dir = mkdtempSync(join(tmpdir(), 'nvs-tls-'));
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem'), '-days', '1', '-subj', '/CN=pinned.test', '-addext', 'subjectAltName=DNS:pinned.test'], { stdio: 'ignore' });
  return { key: readFileSync(join(dir, 'k.pem')), cert: readFileSync(join(dir, 'c.pem')) };
}

test('nodeFetch connects to the pinned address, not to what the hostname resolves to', async () => {
  const c = cert();
  const seen: { host?: string; ua?: string }[] = [];
  const server = createServer(c, (req, res) => {
    seen.push({ host: req.headers.host, ua: req.headers['user-agent'] });
    if (req.url === '/redir') (res.writeHead(302, { location: 'https://elsewhere.test/' }), res.end());
    else (res.writeHead(200, { 'content-type': 'text/html' }), res.end('<html>hello</html>'));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  try {
    // "pinned.test" does not resolve in DNS: success proves the connection used the pinned 127.0.0.1.
    const f = makeNodeFetch({ tls: { ca: c.cert.toString(), port } });
    const ok = await f('https://pinned.test/page', { headers: { 'User-Agent': 'NVS-Agent-Desk/0.1 (+https://nvs.example/bot)' }, redirect: 'manual', address: '127.0.0.1' });
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), '<html>hello</html>');
    assert.equal(seen[0]!.host, 'pinned.test', 'the Host header keeps the real hostname');
    assert.match(seen[0]!.ua ?? '', /^NVS-Agent-Desk\//);

    const redir = await f('https://pinned.test/redir', { headers: {}, redirect: 'manual', address: '127.0.0.1' });
    assert.equal(redir.status, 302);
    assert.equal(redir.headers.get('location'), 'https://elsewhere.test/');
  } finally {
    server.close();
  }
});

test('nodeFetch caps the body and fails on a certificate that does not match the hostname', async () => {
  const c = cert();
  const server = createServer(c, (_req, res) => res.end('x'.repeat(5000)));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as AddressInfo).port;
  try {
    const small = makeNodeFetch({ maxBytes: 1000, tls: { ca: c.cert.toString(), port } });
    const r = await small('https://pinned.test/', { headers: {}, redirect: 'manual', address: '127.0.0.1' });
    assert.ok((await r.text()).length <= 1000);
    const wrongName = makeNodeFetch({ tls: { ca: c.cert.toString(), port } });
    await assert.rejects(wrongName('https://other-name.test/', { headers: {}, redirect: 'manual', address: '127.0.0.1' }), /altnames|certificate|match/i);
  } finally {
    server.close();
  }
});
