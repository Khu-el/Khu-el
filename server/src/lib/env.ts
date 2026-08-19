import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

try {
  // Built into Node 20.6+/22 -- no dotenv dependency needed. Safe to skip
  // silently if there's no .env file (e.g. real env vars set some other way).
  process.loadEnvFile();
} catch {
  // no .env file present -- that's fine, fall through to process.env / defaults
}

const dataDir = process.env.NTE_DATA_DIR ?? path.resolve(process.cwd(), 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const uploadsDir = process.env.NTE_UPLOADS_DIR ?? path.resolve(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });

/**
 * JWT secret: use an env var in any real deployment. For local/dev use we
 * persist a generated secret to disk so restarts don't invalidate every
 * session, but this file should never be committed or shared.
 */
function resolveJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const secretPath = path.join(dataDir, '.jwt-secret');
  if (existsSync(secretPath)) return readFileSync(secretPath, 'utf-8').trim();
  const generated = randomBytes(48).toString('hex');
  writeFileSync(secretPath, generated, { mode: 0o600 });
  console.warn(
    '[env] JWT_SECRET not set — generated a random secret at', secretPath,
    '(set JWT_SECRET yourself before deploying anywhere beyond your own machine).'
  );
  return generated;
}

/**
 * Registration is fail-closed: nobody can create an account without this
 * code, including the operator. Unlike the JWT secret, this one is *meant*
 * to be shared (with the family members you actually want to let in), so
 * when we auto-generate one for local/dev convenience we print the value
 * itself, not just where it's stored.
 */
function resolveInviteCode(): string {
  if (process.env.INVITE_CODE) return process.env.INVITE_CODE;
  const codePath = path.join(dataDir, '.invite-code');
  if (existsSync(codePath)) return readFileSync(codePath, 'utf-8').trim();
  const generated = randomBytes(9).toString('base64url'); // short enough to read out loud / type
  writeFileSync(codePath, generated, { mode: 0o600 });
  console.warn(
    `[env] INVITE_CODE not set — generated one: ${generated}`,
    `(also saved at ${codePath}). Share this with whoever should be able to register; set INVITE_CODE yourself to control or change it.`
  );
  return generated;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  dataDir,
  uploadsDir,
  dbPath: path.join(dataDir, 'nte.db'),
  jwtSecret: resolveJwtSecret(),
  inviteCode: resolveInviteCode(),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176').split(','),
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? '',
  },
  get smtpConfigured() {
    return Boolean(this.smtp.host && this.smtp.user && this.smtp.pass && this.smtp.from);
  },
};
