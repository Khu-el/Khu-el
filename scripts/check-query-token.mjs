// Keeps the query-string token an exception rather than a default.
//
// A JWT in a query string is not equivalent to one in an Authorization header.
// It is written to access and proxy logs, kept in browser history, and sent
// onward as a Referer when the page links outward. These tokens last 30 days,
// so a single leaked log line is 30 days of access. A query token on a
// state-changing route can also be carried by a bare cross-origin `<img>` or
// link, which a header can never be.
//
// One route genuinely needs it: a plain `<a href>` file download cannot set a
// header. That one route opts in via requireAuthAllowingQueryToken. Every
// other route uses requireAuth, which reads the header only.
//
// This is checked rather than remembered because the failure is silent: adding
// `requireAuthAllowingQueryToken` to a new route, or mounting it on a router,
// widens the opening without breaking anything a test or the type checker
// would notice.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SERVER_SRC = join(ROOT, 'server', 'src');

// The single route permitted to accept ?token=. Keeping this a list of one is
// the point; adding to it is a deliberate act that shows up in a diff.
const ALLOWED = [
  {
    file: 'routes/attachments.ts',
    route: "attachmentsRouter.get('/attachments/:id/download'",
    why: 'a plain <a href> download cannot set an Authorization header',
  },
];

const EXCEPTION_FN = 'requireAuthAllowingQueryToken';

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

const findings = [];
const seen = new Set();

for (const file of walk(SERVER_SRC)) {
  const rel = relative(SERVER_SRC, file).split('\\').join('/');
  const source = readFileSync(file, 'utf-8');
  const lines = source.split('\n');

  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;

    // `req.query.token` is how the exception is actually read. It belongs in
    // lib/auth.ts and nowhere else -- a route reading it directly would bypass
    // this check entirely.
    if (/req\.query\.token/.test(line) && rel !== 'lib/auth.ts') {
      findings.push(`${at}  reads req.query.token outside lib/auth.ts`);
    }

    if (!line.includes(EXCEPTION_FN)) return;

    // The declaration, the export and the import are not usages.
    if (rel === 'lib/auth.ts') return;
    if (/^\s*import\b/.test(line) || /^\s*}?\s*from\s+/.test(line)) return;

    const allowed = ALLOWED.find((a) => a.file === rel && line.includes(a.route));
    if (allowed) {
      seen.add(`${allowed.file} ${allowed.route}`);
      return;
    }

    if (/\.use\s*\(/.test(line)) {
      findings.push(`${at}  mounts ${EXCEPTION_FN} on a whole router, which opts every route on it in`);
    } else {
      findings.push(`${at}  uses ${EXCEPTION_FN} on a route that is not in the allowed list`);
    }
  });
}

// A stale allow-list entry is its own problem: it reads as permission for a
// route that no longer exists, and hides the fact that the exception moved.
for (const a of ALLOWED) {
  if (!seen.has(`${a.file} ${a.route}`)) {
    findings.push(`${a.file}  allowed route no longer uses ${EXCEPTION_FN} -- remove the stale entry: ${a.route}`);
  }
}

if (findings.length > 0) {
  console.error('Query-string token is allowed on more than the one route that needs it:\n');
  for (const f of findings) console.error(`  ${f}`);
  console.error(`\nEvery other route must use requireAuth, which reads the Authorization header only.`);
  process.exit(1);
}

console.log(`Query-string token accepted on ${ALLOWED.length} route only:`);
for (const a of ALLOWED) console.log(`  ${a.file} -- ${a.why}`);
