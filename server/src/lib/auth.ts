import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { env } from './env.js';
import type { Role } from './roles.js';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  role: Role;
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

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  // Plain <a href> downloads can't set an Authorization header, so file-download
  // links fall back to a ?token= query param. Everything else must use the header.
  const queryToken = typeof req.query.token === 'string' ? req.query.token : null;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : queryToken;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  try {
    const payload = jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
