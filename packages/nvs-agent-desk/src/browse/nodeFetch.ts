import { request } from 'node:https';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { FetcherDeps } from './fetcher.ts';

/**
 * Real fetch for the compliant fetcher. It connects to the address that already passed the private-range check
 * (`init.address`) instead of resolving the hostname again, so DNS rebinding cannot swap in an internal IP. The URL's
 * hostname is still used for SNI, certificate verification and the Host header. Redirects are never followed here,
 * compression is not requested, and the body is capped.
 *
 * Note: this connects directly. In an environment that only allows egress through an HTTP proxy it will fail closed
 * (connection error), which is the safe outcome; use the saved-pages mode of the CLI there.
 */
export function makeNodeFetch(opts: { maxBytes?: number; timeoutMs?: number; tls?: { ca?: string; port?: number } } = {}): FetcherDeps['fetchImpl'] {
  const maxBytes = opts.maxBytes ?? 2_000_000;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  return (url, init) =>
    new Promise((resolve, reject) => {
      const u = new URL(url);
      const family = isIP(init.address) || 4;
      const req = request(
        {
          host: u.hostname,
          port: opts.tls?.port ?? 443,
          path: u.pathname + u.search,
          method: 'GET',
          headers: { ...init.headers, Host: u.host, 'Accept-Encoding': 'identity' },
          servername: u.hostname,
          ca: opts.tls?.ca,
          timeout: timeoutMs,
          // Pin: answer every lookup with the validated address. Newer Node may ask for all addresses.
          lookup: (_host, o, cb) => {
            if ((o as { all?: boolean }).all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [{ address: init.address, family }]);
            else cb(null, init.address, family);
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (b: Buffer) => {
            size += b.length;
            if (size > maxBytes) return void res.destroy();
            chunks.push(b);
          });
          const done = () => resolve({ status: res.statusCode ?? 0, headers: { get: (n: string) => (res.headers[n.toLowerCase()] as string | undefined) ?? null }, text: async () => Buffer.concat(chunks).toString('utf8') });
          res.on('end', done);
          res.on('close', done);
        },
      );
      req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs} ms`)));
      req.on('error', reject);
      req.end();
    });
}

/** Resolve a hostname to all of its addresses (the fetcher then refuses private ones). */
export async function resolveAll(host: string): Promise<string[]> {
  return (await dnsLookup(host, { all: true })).map((r) => r.address);
}
