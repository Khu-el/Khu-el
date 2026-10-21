// Compliant browsing. The reference project (jo-inc/camofox-browser, MIT) exists to defeat bot detection:
// C++-level fingerprint spoofing, residential-proxy routing, cookie import. This module is the opposite
// design on purpose: identify honestly, obey robots.txt, rate-limit, refuse internal addresses, and prefer an
// official API where one exists. Sites that block automated access are not bypassed; the result is a refusal
// the principal can act on (use the official API, ask the site, or fetch by hand).

export interface UrlVerdict {
  allow: boolean;
  reasons: string[];
}

const PRIVATE_V4 = [
  /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

export function isPrivateAddress(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  if (PRIVATE_V4.some((re) => re.test(h))) return true;
  if (h === '::1' || h === '::' || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe[89ab][0-9a-f]:/.test(h)) return true;
  const mapped = h.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? PRIVATE_V4.some((re) => re.test(mapped[1]!)) : false;
}

/** Literal checks only. A fetcher must ALSO call isPrivateAddress on the resolved IP (DNS rebinding). */
export function checkUrl(raw: string): UrlVerdict {
  const reasons: string[] = [];
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { allow: false, reasons: ['not a valid URL'] };
  }
  if (u.protocol !== 'https:') reasons.push('only https is allowed');
  if (u.username || u.password) reasons.push('credentials in URL are refused');
  if (u.port && u.port !== '443') reasons.push('non-default port is refused');
  if (isPrivateAddress(u.hostname)) reasons.push('private, loopback, link-local or internal host');
  return { allow: reasons.length === 0, reasons };
}

// ---- robots.txt (RFC 9309 subset: groups, Allow/Disallow, * and $, longest match, Allow wins ties) ---------

interface Rule {
  allow: boolean;
  pattern: string;
}

export function parseRobots(text: string): Map<string, Rule[]> {
  const groups = new Map<string, Rule[]>();
  let agents: string[] = [];
  let inRules = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').match(/^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!;
    if (key === 'user-agent') {
      if (inRules) (agents = [], (inRules = false));
      agents.push(val.toLowerCase());
      for (const a of agents) if (!groups.has(a)) groups.set(a, []);
    } else if (key === 'allow' || key === 'disallow') {
      inRules = true;
      for (const a of agents) groups.get(a)!.push({ allow: key === 'allow', pattern: val });
    }
  }
  return groups;
}

function matches(pattern: string, path: string): boolean {
  if (pattern === '') return false;
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp('^' + body.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + (anchored ? '$' : ''));
  return re.test(path);
}

export function robotsAllows(groups: Map<string, Rule[]>, userAgent: string, path: string): boolean {
  const ua = userAgent.toLowerCase();
  const specific = [...groups.keys()].filter((k) => k !== '*' && ua.includes(k)).sort((a, b) => b.length - a.length)[0];
  const rules = groups.get(specific ?? '*') ?? [];
  let best: Rule | null = null;
  for (const r of rules) {
    if (!matches(r.pattern, path)) continue;
    if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

// ---- rate limiting ------------------------------------------------------------------------------------

export class HostRateLimiter {
  private last = new Map<string, number>();
  private minIntervalMs: number;
  private now: () => number;
  constructor(minIntervalMs: number, now: () => number = Date.now) {
    this.minIntervalMs = minIntervalMs;
    this.now = now;
  }
  /** Milliseconds to wait before the next request to this host (0 = go now). Records the request when it returns 0. */
  take(host: string): number {
    const t = this.now();
    const wait = Math.max(0, (this.last.get(host) ?? -Infinity) + this.minIntervalMs - t);
    if (wait === 0) this.last.set(host, t);
    return wait;
  }
}
