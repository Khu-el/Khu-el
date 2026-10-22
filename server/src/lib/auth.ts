import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db.js';
import { env } from './env.js';
import { isRole, type Role } from './roles.js';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
}

interface DbAuthRow {
  id: string;
  email: string;
  role: string;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '30d' });
}

/** A download link may carry this grant. It is not a session. */
export function signDownloadGrant(sub: string, attachmentId: string) {
  return jwt.sign(
    { sub, attachmentId, purpose: 'attachment-download' },
    env.jwtSecret,
    { expiresIn: 60 },
  );
}

export interface AuthedRequest extends Request {
  user?: AuthTokenPayload;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : null;
}

function authenticate(req: AuthedRequest, res: Response, next: NextFunction, token: string | null) {
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  let claims: AuthTokenPayload & { purpose?: string };
  try {
    claims = jwt.verify(token, env.jwtSecret) as AuthTokenPayload & { purpose?: string };
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  // A download grant is not a session. It is accepted only on the download
  // route, and only from the query string.
  if (claims.purpose === 'attachment-download') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  // The token proves who signed in; the database says who they are now. Role
  // and email used to be read from the token alone, so for up to 30 days after
  // an operator changed someone's role -- or deleted the account outright --
  // the old token went on carrying the old authority. A SYSTEM_ADMIN demoted
  // in the database stayed an admin until the token expired.
  const row = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(claims.sub) as
    | DbAuthRow
    | undefined;
  if (!row) return res.status(401).json({ error: 'This account no longer exists' });
  if (!isRole(row.role)) {
    console.error('[auth] refusing account with unrecognized role', { userId: row.id, role: row.role });
    return res.status(403).json({ error: 'This account is not permitted to sign in' });
  }

  req.user = { sub: row.id, email: row.email, role: row.role };
  next();
}

/**
 * The default: the token must arrive in the Authorization header.
 *
 * A token in a query string is not equivalent to one in a header. It is
 * written to access and proxy logs, kept in browser history, and sent on as a
 * Referer when the page links outward. These tokens last 30 days, so one
 * leaked line in a log file is 30 days of access. Accepting a query token on a
 * state-changing route also means a bare cross-origin `<img>` or link can
 * carry it, which a header can never do.
 */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  return authenticate(req, res, next, bearerToken(req));
}

interface DownloadGrant {
  sub?: string;
  attachmentId?: string;
  purpose?: string;
}

/**
 * `?token=` on the download route is a 60-second grant for that one file.
 * A session JWT in the query is refused: those tokens last 30 days and a URL
 * is copied into logs, history, and Referer headers. The header still carries
 * the session, and it wins when both are present.
 */
function authenticateDownloadGrant(req: AuthedRequest, res: Response, next: NextFunction, token: string) {
  let claims: DownloadGrant;
  try {
    claims = jwt.verify(token, env.jwtSecret) as DownloadGrant;
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (claims.purpose !== 'attachment-download' || typeof claims.sub !== 'string' || claims.attachmentId !== req.params.id) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const row = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(claims.sub) as DbAuthRow | undefined;
  if (!row) return res.status(401).json({ error: 'This account no longer exists' });
  if (!isRole(row.role)) {
    console.error('[auth] refusing account with unrecognized role', { userId: row.id, role: row.role });
    return res.status(403).json({ error: 'This account is not permitted to sign in' });
  }
  req.user = { sub: row.id, email: row.email, role: row.role };
  next();
}

/**
 * The exception, and it stays an exception: a plain download link cannot set
 * an Authorization header, so the file-download route -- and only that route --
 * also accepts `?token=`. The query value must be a download grant, not the
 * session. Mount this deliberately per route rather than on a router.
 */
export function requireAuthAllowingQueryToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = bearerToken(req);
  if (header) return authenticate(req, res, next, header);
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  if (!queryToken) return res.status(401).json({ error: 'Missing bearer token' });
  return authenticateDownloadGrant(req, res, next, queryToken);
}
