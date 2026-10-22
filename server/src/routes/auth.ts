import { randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../lib/db.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { hashPassword, requireAuth, signToken, verifyPassword, type AuthedRequest } from '../lib/auth.js';
import { env } from '../lib/env.js';
import { newId, nowIso } from '../lib/id.js';
import { FailureLimiter } from '../lib/rateLimit.js';
import { isRole, type Role } from '../lib/roles.js';

/** Constant-time compare so a wrong guess can't be distinguished by response timing. */
function isValidInviteCode(submitted: unknown): boolean {
  if (typeof submitted !== 'string' || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(env.inviteCode);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Everyone registers as a FAMILY_COUNCIL_MEMBER. Two deployment settings are
 * the only exceptions, and both are matched on the address, never on a role
 * field in the request:
 *
 * - BOOTSTRAP_ADMIN_EMAIL registers as SYSTEM_ADMIN.
 * - MINISTRY_OPERATOR_EMAILS registers as NTE_SYSTEMS_OPERATOR.
 *
 * Unset means registration cannot produce either role. Promoting anyone else
 * is not an API operation. PATCH /api/auth/me refuses a role field.
 */
function assignRoleAtRegistration(email: string): Role {
  const normalized = email.trim().toLowerCase();
  const bootstrap = env.bootstrapAdminEmail;
  if (bootstrap && normalized === bootstrap) return 'SYSTEM_ADMIN';
  if (env.ministryOperatorEmails.includes(normalized)) return 'NTE_SYSTEMS_OPERATOR';
  return 'FAMILY_COUNCIL_MEMBER';
}

/** The invite code is shared. Admin registration also needs this deployment secret. */
function isValidBootstrapSecret(submitted: unknown): boolean {
  const expected = env.bootstrapAdminSecret;
  if (!expected || typeof submitted !== 'string' || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function canonicalEmail(email: string): string | null {
  if (email !== email.trim()) return null;
  return email.toLowerCase();
}

/**
 * Failed sign-ins are limited per address and per client IP; failed invite
 * codes per client IP. Either limit answers 429 with Retry-After until its
 * 15-minute window closes. The per-address limit is what stops a password being
 * guessed from many machines; the per-IP limits stop one machine spraying many
 * addresses or invite codes. req.ip is only the real client when TRUST_PROXY is
 * set to match the proxy in front of this server -- see lib/env.ts.
 */
const WINDOW_MS = 15 * 60 * 1000;
const loginByEmail = new FailureLimiter(10, WINDOW_MS);
const loginByIp = new FailureLimiter(30, WINDOW_MS);
const inviteByIp = new FailureLimiter(10, WINDOW_MS);

function tooMany(res: import('express').Response, retryAfterMs: number) {
  res.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  return res.status(429).json({ error: 'Too many failed attempts. Try again later.' });
}

/**
 * A real bcrypt hash of nothing anyone knows, compared against when the email
 * has no account. Without it an unknown address was answered before bcrypt ran
 * -- measurably faster than a wrong password -- which told anyone timing the
 * responses which addresses have accounts.
 */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), 10);

export const authRouter = Router();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
  created_at: string;
}

function toPublicUser(row: UserRow) {
  if (!isRole(row.role)) {
    throw new Error(`User ${row.id} has unrecognized role ${JSON.stringify(row.role)}`);
  }
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, createdAt: row.created_at };
}

authRouter.post('/register', asyncHandler(async (req, res) => {
  const { email, password, displayName, inviteCode } = req.body ?? {};
  const ipKey = `ip:${req.ip}`;
  const wait = inviteByIp.retryAfterMs(ipKey);
  if (wait > 0) return tooMany(res, wait);
  if (!isValidInviteCode(inviteCode)) {
    inviteByIp.recordFailure(ipKey);
    return res.status(403).json({ error: 'Invalid or missing invite code' });
  }
  if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required' });
  const canonical = canonicalEmail(email);
  if (!canonical) return res.status(400).json({ error: 'Email must not include leading or trailing spaces' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (typeof displayName !== 'string' || !displayName.trim()) return res.status(400).json({ error: 'Display name is required' });

  // The role is assigned here, never taken from the request. It used to be
  // read from the body, which made the invite code an admin credential: a
  // SYSTEM_ADMIN sees and can delete every user's records in every app, and
  // the invite code is deliberately the shareable one. Authority comes from
  // whoever sets the deployment's environment, not from whoever was invited.
  // The bootstrap address also needs BOOTSTRAP_ADMIN_SECRET. Unset, missing,
  // or wrong fails closed and inserts nothing. A second admin is a conflict.
  const chosenRole: Role = assignRoleAtRegistration(canonical);
  if (chosenRole === 'SYSTEM_ADMIN') {
    if (!isValidBootstrapSecret(req.body?.bootstrapAdminSecret)) {
      return res.status(403).json({ error: 'Bootstrap admin secret is missing or wrong' });
    }
    const existingAdmin = db.prepare(`SELECT id FROM users WHERE role = 'SYSTEM_ADMIN'`).get();
    if (existingAdmin) return res.status(409).json({ error: 'A system admin already exists' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(canonical);
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = newId('user');
  const passwordHash = await hashPassword(password);
  const createdAt = nowIso();
  try {
    db.prepare('INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      id,
      canonical,
      passwordHash,
      displayName.trim(),
      chosenRole,
      createdAt
    );
  } catch (err) {
    // The existence check above runs before the hash is awaited, so two
    // registrations for one address can both pass it. The UNIQUE constraint
    // is what actually decides; report the loser as the conflict it is.
    if ((err as { code?: string }).code === 'ERR_SQLITE_ERROR' && /UNIQUE/i.test((err as Error).message)) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    throw err;
  }

  const token = signToken({ sub: id, email: canonical, role: chosenRole });
  res.status(201).json({ token, user: { id, email: canonical, displayName: displayName.trim(), role: chosenRole, createdAt } });
}));

authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' });
  const canonical = canonicalEmail(email);
  if (!canonical) return res.status(400).json({ error: 'Email must not include leading or trailing spaces' });

  const emailKey = `email:${canonical}`;
  const ipKey = `ip:${req.ip}`;
  const wait = Math.max(loginByEmail.retryAfterMs(emailKey), loginByIp.retryAfterMs(ipKey));
  if (wait > 0) return tooMany(res, wait);

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(canonical) as UserRow | undefined;
  // Always run bcrypt, so an unknown address takes as long as a wrong password.
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !valid) {
    loginByEmail.recordFailure(emailKey);
    loginByIp.recordFailure(ipKey);
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  loginByEmail.reset(emailKey);
  loginByIp.reset(ipKey);

  const user = toPublicUser(row);
  const token = signToken({ sub: row.id, email: row.email, role: user.role });
  res.json({ token, user });
}));

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.sub) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(row) });
});

/**
 * Your own display name, and nothing else. `role` used to be accepted here,
 * which let any signed-in user promote themselves to SYSTEM_ADMIN -- and an
 * admin reads and deletes every other user's records in every app, across both
 * lanes. A role is an assertion about authority; the governance model exists
 * precisely so that such a claim cannot be self-issued.
 *
 * A `role` in the body is refused outright rather than ignored, so a caller
 * that believes it is changing one is told that it is not.
 */
authRouter.patch('/me', requireAuth, (req: AuthedRequest, res) => {
  const { displayName, role } = req.body ?? {};
  if (role !== undefined) {
    return res.status(403).json({ error: 'Your role is not self-assignable; it is set by whoever operates this deployment.' });
  }
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.sub) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: 'User not found' });

  const nextDisplayName = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : row.display_name;

  db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(nextDisplayName, row.id);
  res.json({ user: toPublicUser({ ...row, display_name: nextDisplayName }) });
});

authRouter.get('/users', requireAuth, (req: AuthedRequest, res) => {
  // Lightweight roster so a shared workspace can show "who's who". Email stays
  // off this list. Role is an authority claim, so only SYSTEM_ADMIN receives it.
  const rows = db.prepare('SELECT id, display_name, role FROM users').all() as { id: string; display_name: string; role: string }[];
  const admin = req.user!.role === 'SYSTEM_ADMIN';
  res.json({
    users: rows.map((r) => {
      if (!isRole(r.role)) throw new Error(`User ${r.id} has unrecognized role ${JSON.stringify(r.role)}`);
      return admin
        ? { id: r.id, displayName: r.display_name, role: r.role }
        : { id: r.id, displayName: r.display_name };
    }),
  });
});
