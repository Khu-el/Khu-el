import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { db } from '../lib/db.js';
import { hashPassword, requireAuth, signToken, verifyPassword, type AuthedRequest } from '../lib/auth.js';
import { env } from '../lib/env.js';
import { newId, nowIso } from '../lib/id.js';
import { ROLES, type Role } from '../lib/roles.js';

/** Constant-time compare so a wrong guess can't be distinguished by response timing. */
function isValidInviteCode(submitted: unknown): boolean {
  if (typeof submitted !== 'string' || !submitted) return false;
  const a = Buffer.from(submitted);
  const b = Buffer.from(env.inviteCode);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const authRouter = Router();

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: Role;
  created_at: string;
}

function toPublicUser(row: UserRow) {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role, createdAt: row.created_at };
}

authRouter.post('/register', async (req, res) => {
  const { email, password, displayName, role, inviteCode } = req.body ?? {};
  if (!isValidInviteCode(inviteCode)) return res.status(403).json({ error: 'Invalid or missing invite code' });
  if (typeof email !== 'string' || !email.includes('@')) return res.status(400).json({ error: 'A valid email is required' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (typeof displayName !== 'string' || !displayName.trim()) return res.status(400).json({ error: 'Display name is required' });
  const chosenRole: Role = ROLES.includes(role) ? role : 'FAMILY_COUNCIL_MEMBER';

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const id = newId('user');
  const passwordHash = await hashPassword(password);
  const createdAt = nowIso();
  db.prepare('INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
    id,
    email.toLowerCase(),
    passwordHash,
    displayName.trim(),
    chosenRole,
    createdAt
  );

  const token = signToken({ sub: id, email: email.toLowerCase(), role: chosenRole });
  res.status(201).json({ token, user: { id, email: email.toLowerCase(), displayName: displayName.trim(), role: chosenRole, createdAt } });
});

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Email and password are required' });

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRow | undefined;
  if (!row) return res.status(401).json({ error: 'Invalid email or password' });

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const token = signToken({ sub: row.id, email: row.email, role: row.role });
  res.json({ token, user: toPublicUser(row) });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.sub) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(row) });
});

authRouter.patch('/me', requireAuth, (req: AuthedRequest, res) => {
  const { displayName, role } = req.body ?? {};
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user!.sub) as UserRow | undefined;
  if (!row) return res.status(404).json({ error: 'User not found' });

  const nextDisplayName = typeof displayName === 'string' && displayName.trim() ? displayName.trim() : row.display_name;
  const nextRole: Role = ROLES.includes(role) ? role : row.role;

  db.prepare('UPDATE users SET display_name = ?, role = ? WHERE id = ?').run(nextDisplayName, nextRole, row.id);
  res.json({ user: toPublicUser({ ...row, display_name: nextDisplayName, role: nextRole }) });
});

authRouter.get('/users', requireAuth, (_req: AuthedRequest, res) => {
  // Lightweight roster so a shared (Lane B) workspace can show "who's who" -- no emails beyond your own account's need.
  const rows = db.prepare('SELECT id, display_name, role FROM users').all() as { id: string; display_name: string; role: Role }[];
  res.json({ users: rows.map((r) => ({ id: r.id, displayName: r.display_name, role: r.role })) });
});
