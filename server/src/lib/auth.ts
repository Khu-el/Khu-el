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
  let claims: AuthTokenPayload;
  try {
    claims = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
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

/**
 * The exception, and it stays an exception: a plain `<a href>` download cannot
 * set an Authorization header, so the file-download route -- and only that
 * route -- also accepts `?token=`. Mount this deliberately per route rather
 * than on a router, so that adding a route never silently widens the opening.
 */
export function requireAuthAllowingQueryToken(req: AuthedRequest, res: Response, next: NextFunction) {
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  return authenticate(req, res, next, bearerToken(req) ?? queryToken);
}
