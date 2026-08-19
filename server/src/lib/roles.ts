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

export const APP_IDS = ['deal-architect', 'capital-readiness', 'notes-underwriting', 'legacy-estate'] as const;
export type AppId = (typeof APP_IDS)[number];

/** legacy-estate is a shared single-family workspace; the other three are private per user. */
export function isSharedApp(appId: string) {
  return appId === 'legacy-estate';
}

export function canWrite(role: Role) {
  return role !== 'READ_ONLY_AUDITOR';
}
