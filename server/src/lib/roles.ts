export const ROLES = [
  'SYSTEM_ADMIN',
  'NTE_TRUSTEE_OFFICE',
  'NTE_AUTHORIZED_REP',
  'NTE_SYSTEMS_OPERATOR',
  'NTE_VIRTUAL_OPERATOR',
  'NTE_TREASURY_OPERATOR',
  'HOUSE_TRUSTEE_OFFICE',
  'HOUSE_AUTHORIZED_REP',
  'FAMILY_COUNCIL_MEMBER',
  'PROFESSIONAL_REVIEWER',
  'READ_ONLY_AUDITOR',
] as const;

export type Role = (typeof ROLES)[number];

export const APP_IDS = ['deal-architect', 'capital-readiness', 'notes-underwriting', 'legacy-estate', 'financial-services-crm'] as const;
export type AppId = (typeof APP_IDS)[number];

export function isRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}

/** legacy-estate is a shared single-family workspace; every other app is private per user. */
export function isSharedApp(appId: string) {
  return appId === 'legacy-estate';
}

export function canWrite(role: Role) {
  return role !== 'READ_ONLY_AUDITOR';
}
