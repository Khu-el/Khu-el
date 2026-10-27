export const ROLES = [
  'SYSTEM_ADMIN',
  'NTE_TRUSTEE_OFFICE',
  'NTE_AUTHORIZED_REP',
  'NTE_SYSTEMS_OPERATOR',
  'NTE_VIRTUAL_OPERATOR',
  'NTE_TREASURY_OPERATOR',
  'PROFESSIONAL_REVIEWER',
  'READ_ONLY_AUDITOR',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Invited account that is not the bootstrap admin and not on the ministry
 * operator list. Writable, and it does not read another account's records.
 * Chaz confirmed this label on Oct 23, 2026.
 */
export const DEFAULT_INVITE_ROLE: Role = 'PROFESSIONAL_REVIEWER';

export const APP_IDS = ['deal-architect', 'capital-readiness', 'notes-underwriting', 'financial-services-crm'] as const;
export type AppId = (typeof APP_IDS)[number];

export function isRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

/** Every planning app is private per account. No app is a shared workspace. */
export function isSharedApp(appId: string) {
  void appId;
  return false;
}

export function canWrite(role: Role) {
  return role !== 'READ_ONLY_AUDITOR';
}
