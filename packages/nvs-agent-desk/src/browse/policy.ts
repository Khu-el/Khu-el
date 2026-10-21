// Compliant browsing. The reference project (jo-inc/camofox-browser, MIT) exists to defeat bot detection:
// C++-level fingerprint spoofing, residential-proxy routing, cookie import. This module is the opposite
// design on purpose: identify honestly, obey robots.txt, rate-limit, refuse internal addresses, and prefer an
// official API where one exists. Sites that block automated access are not bypassed; the result is a refusal
// the principal can act on (use the official API, ask the site, or fetch by hand).

export interface UrlVerdict {
  allow: boolean;
  reasons: string[];
}

// IPv4 ranges that are never a public web server. [base, prefix length].
const BLOCKED_V4: [string, number][] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3], // multicast + reserved + broadcast
];

function v4ToInt(h: string): number | null {
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((x) => x > 255)) return null;
  return ((o[0]! << 24) | (o[1]! << 16) | (o[2]! << 8) | o[3]!) >>> 0;
}

function blockedV4(n: number): boolean {
  return BLOCKED_V4.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return ((n & mask) >>> 0) === ((v4ToInt(base)! & mask) >>> 0);
  });
}

/** Expand an IPv6 literal (with optional embedded dotted v4) into 8 16-bit groups, or null if malformed. */
function expandV6(h: string): number[] | null {
  let s = h;
  const dotted = s.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) {
    const n = v4ToInt(dotted[1]!);
    if (n === null) return null;
    s = s.slice(0, -dotted[1]!.length) + ((n >>> 16) & 0xffff).toString(16) + ':' + (n & 0xffff).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...Array(fill).fill('0'), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

export function isPrivateAddress(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true;
  const v4 = v4ToInt(h);
  if (v4 !== null) return blockedV4(v4);
  if (!h.includes(':')) return false; // an ordinary hostname; the fetcher checks what it resolves to
  const g = expandV6(h);
  if (!g) return true; // unparseable address literal: refuse
  const embedded = ((g[6]! << 16) | g[7]!) >>> 0;
  if (g.slice(0, 5).every((x) => x === 0) && (g[5] === 0xffff || g[5] === 0)) return blockedV4(embedded) || g.slice(0, 7).every((x) => x === 0); // ::ffff:a.b.c.d, ::a.b.c.d, ::, ::1
  if (g[0] === 0x64 && g[1] === 0xff9b) return blockedV4(embedded); // NAT64 64:ff9b::/96
  if ((g[0]! & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0]! & 0xffc0) === 0xfe80 || (g[0]! & 0xffc0) === 0xfec0) return true; // fe80::/10 link-local, fec0::/10 site-local
  if ((g[0]! & 0xff00) === 0xff00) return true; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  return false;
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
