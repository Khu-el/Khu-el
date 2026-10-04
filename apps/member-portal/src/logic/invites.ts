// Invite codes and email normalization, matching the database's rules in
// private.enforce_signup_invite (lower(btrim(email)); 18 hex characters).

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeEmail(email));
}

/** Accepts codes typed with spaces, dashes or capitals: "AABB-CCDD EEFF 001122". */
export function normalizeInviteCode(code: string): string {
  return code.replace(/[\s-]/g, '').toLowerCase();
}

export function isValidInviteCode(code: string): boolean {
  return /^[0-9a-f]{18}$/.test(normalizeInviteCode(code));
}

/** Display a code in readable groups of six: "aabbcc-ddeeff-001122". */
export function formatInviteCode(code: string): string {
  const c = normalizeInviteCode(code);
  return c.match(/.{1,6}/g)?.join('-') ?? c;
}
