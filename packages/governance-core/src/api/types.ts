export const APP_IDS = ['deal-architect', 'capital-readiness', 'notes-underwriting', 'legacy-estate'] as const;
export type AppId = (typeof APP_IDS)[number];

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

export const ROLE_LABELS: Record<Role, string> = {
  SYSTEM_ADMIN: 'System Admin',
  NTE_TRUSTEE_OFFICE: 'NTE Trustee Office (EDM)',
  NTE_AUTHORIZED_REP: 'NTE Authorized Representative',
  NTE_SYSTEMS_OPERATOR: 'NTE Systems Operator',
  NTE_VIRTUAL_OPERATOR: 'NTE Virtual Solutions Operator',
  NTE_TREASURY_OPERATOR: 'NTE Treasury Operator',
  HOUSE_TRUSTEE_OFFICE: 'House Trustee Office (House of Ransom)',
  HOUSE_AUTHORIZED_REP: 'House Authorized Representative',
  FAMILY_COUNCIL_MEMBER: 'Family Council Member',
  PROFESSIONAL_REVIEWER: 'Professional Reviewer',
  READ_ONLY_AUDITOR: 'Read-Only Auditor',
};

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface ApiRecord<T> {
  id: string;
  type: string;
  authority: {
    lane: string;
    principalId: string;
    actingOfficeId: string;
    capacity: string;
    authorityRef?: string;
    sourceRef?: string;
    assertionStatus: string;
  };
  data: T;
  evidenceRefs: unknown[];
  reconciliationStatus: string;
  createdAt: string;
  updatedAt: string;
  reconciledAt?: string;
  ownerId: string;
}

export interface ApiAttachment {
  id: string;
  recordId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
}
