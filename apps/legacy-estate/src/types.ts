import type { AssertionStatus, GovernedRecord, Lane } from '@nte/governance-core';

export interface AssetItem {
  id: string;
  name: string;
  assetType: 'REAL_PROPERTY' | 'FINANCIAL_ACCOUNT' | 'BUSINESS_INTEREST' | 'PERSONAL_PROPERTY' | 'DIGITAL_ASSET' | 'OTHER';
  titledOwner: string;
  lane: Lane;
  assertionStatus: AssertionStatus;
  evidenceNote: string;
  estimatedValue: number;
}

export interface EstateDocument {
  id: string;
  docType: 'LIVING_TRUST' | 'POUR_OVER_WILL' | 'FINANCIAL_POA' | 'HEALTHCARE_DIRECTIVE' | 'HIPAA_RELEASE' | 'OTHER';
  name: string;
  status: 'DRAFTED' | 'EXECUTED' | 'NOTARIZED' | 'RECORDED';
  dateOfAction: string;
  attorneyOfRecord: string;
  locationOfOriginal: string;
}

export interface BeneficiaryDesignation {
  id: string;
  accountOrPolicy: string;
  primaryBeneficiary: string;
  contingentBeneficiary: string;
  lastVerified: string;
}

export interface InsurancePolicy {
  id: string;
  policyType: string;
  carrier: string;
  faceValue: number;
  cashValue: number;
  beneficiary: string;
  annualPremium: number;
  notes: string;
}

export interface BusinessInterest {
  id: string;
  entityName: string;
  lane: Lane;
  ownershipPct: number;
  capacityOrOffice: string;
  assertionStatus: AssertionStatus;
  evidenceNote: string;
}

export type DistributionStage = 'DRAFT' | 'FAMILY_COUNCIL_REVIEW' | 'TRUSTEE_REVIEW' | 'PROFESSIONAL_REVIEW' | 'APPROVED' | 'DECLINED';

export interface DistributionRequest {
  id: string;
  description: string;
  assetOrAmount: string;
  requestedBy: string;
  stage: DistributionStage;
  notes: string;
}

export interface ContinuityContact {
  id: string;
  role: string;
  name: string;
  contactInfo: string;
}

export interface ArchiveNote {
  id: string;
  title: string;
  body: string;
  date: string;
}

export interface EstateData {
  familyName: string;
  trustName: string;
  trusteeOffice: string;
  assets: AssetItem[];
  documents: EstateDocument[];
  beneficiaries: BeneficiaryDesignation[];
  insurance: InsurancePolicy[];
  businessInterests: BusinessInterest[];
  distributions: DistributionRequest[];
  continuityContacts: ContinuityContact[];
  archive: ArchiveNote[];
}

export type Estate = GovernedRecord<EstateData>;
