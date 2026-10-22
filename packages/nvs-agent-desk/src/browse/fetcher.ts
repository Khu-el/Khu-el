import { checkUrl, HostRateLimiter, isPrivateAddress, parseRobots, robotsAllows } from './policy.ts';

export type FetchOutcome =
  | { ok: true; status: number; url: string; text: string; truncated: boolean; contentType: string | null }
  | { ok: false; refused: true; reasons: string[] };

export interface FetcherDeps {
  fetchImpl: (url: string, init: { headers: Record<string, string>; redirect: 'manual'; address: string }) => Promise<{ status: number; headers: { get(n: string): string | null }; text(): Promise<string> }>;
  /**
   * Resolve a hostname to IPs so private ranges can be refused after DNS. fetchImpl receives the validated
   * `address` and MUST connect to it (keeping the hostname for SNI/Host), or DNS rebinding can swap in a private IP.
   */
  resolve: (host: string) => Promise<string[]>;
  userAgent: string; // honest, with a contact: "NVS-Agent-Desk/0.1 (+https://example.com/bot)"
  limiter: HostRateLimiter;
  maxChars?: number;
}

/** Fetch one page, obeying robots.txt and a per-host rate limit, refusing internal addresses, never following redirects blindly. */
export async function fetchPage(rawUrl: string, d: FetcherDeps): Promise<FetchOutcome> {
  const refuse = (...reasons: string[]): FetchOutcome => ({ ok: false, refused: true, reasons });
  if (!/^NVS-Agent-Desk\/\S+ \(\+\S+\)$/.test(d.userAgent)) return refuse('user agent must identify the tool and give a contact URL');

  const v = checkUrl(rawUrl);
  if (!v.allow) return refuse(...v.reasons);
  const u = new URL(rawUrl);

  const ips = await d.resolve(u.hostname);
  if (ips.length === 0 || ips.some(isPrivateAddress)) return refuse('host resolves to a private or unresolvable address');

  // One slot covers one fetch: the robots.txt request and the page request are a pair (robots.txt is cacheable).
  const wait = d.limiter.take(u.hostname);
  if (wait > 0) return refuse(`rate limited: retry in ${Math.ceil(wait)} ms`);

  const headers = { 'User-Agent': d.userAgent, Accept: 'text/html,text/plain;q=0.9' };
  const address = ips[0]!;
  const robots = await d.fetchImpl(`https://${u.host}/robots.txt`, { headers, redirect: 'manual', address });
  if (robots.status >= 500 || robots.status === 401 || robots.status === 403 || (robots.status >= 300 && robots.status < 400)) {
    return refuse(`robots.txt answered ${robots.status}: treated as disallow-all`);
  }
  if (robots.status === 200 && !robotsAllows(parseRobots(await robots.text()), d.userAgent, u.pathname + u.search)) {
    return refuse('disallowed by robots.txt; use an official API or ask the site owner');
  }

  const res = await d.fetchImpl(rawUrl, { headers, redirect: 'manual', address });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location');
    return refuse(`redirect to ${loc ?? 'unknown'} not followed; re-submit the target URL so it is checked`);
  }
  if (res.status === 401 || res.status === 403 || res.status === 429) {
    return refuse(`site answered ${res.status}; not working around it (no stealth, no proxy rotation)`);
  }
  const text = await res.text();
  const max = d.maxChars ?? 200_000;
  return { ok: true, status: res.status, url: rawUrl, text: text.slice(0, max), truncated: text.length > max, contentType: res.headers.get('content-type') };
}
