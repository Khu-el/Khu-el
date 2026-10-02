import type { GovernedRecord, MaybeNumber } from '@nte/governance-core';

/**
 * Vocabulary for The Excellence District Financial Services CRM.
 *
 * Every list below is carried over verbatim from the source workbook's `Lists`
 * and `CRM Lists` sheets, so a record exported from here reads the same as one
 * typed into the spreadsheet. Add a value here, not in a component.
 */

// ── CRM Lists (contact qualification) ────────────────────────────────────────

export const OPERATIONAL_LANES = ['Unqualified', 'General Network', 'Licensed Prospect', 'Recruiting', 'Mixed / Manual Review', 'Suppressed'] as const;
export const CONSENT_STATUSES = ['Not Established', 'General Follow-Up OK', 'Commercial Consent Confirmed', 'Withdrawn', 'Do Not Contact'] as const;
export const CONTACT_STATUSES = ['Active', 'Follow-Up', 'Nurture', 'Closed', 'Suppressed', 'Sync Exception'] as const;
export const INTEREST_LEVELS = ['Not Assessed', 'Interested', 'Not Interested', 'Review Later'] as const;
export const RELATIONSHIP_TYPES = ['Family', 'Friend', 'Warm Market', 'Former Coworker', 'Coworker', 'Customer', 'Business Contact'] as const;
export const CONTACT_METHODS = ['Call', 'Text', 'Email', 'Zoom', 'In Person', 'Unknown'] as const;
export const SYNC_STATUSES = ['Imported', 'Synced', 'Needs Review', 'Error', 'Suppressed'] as const;
export const PRIORITIES = ['High', 'Medium', 'Low', 'Watch'] as const;
export const BUSINESS_MOTIVATIONS = ['Extra Income', 'Career Change', 'Entrepreneurship', 'Flexibility', 'Leadership', 'Financial Education', 'Not Assessed'] as const;
export const SOURCES = ['Google Contacts', 'Manual', 'Referral', 'Event', 'Social', 'Personal Network', 'Other'] as const;

// ── Lists (Growth OS pipelines) ──────────────────────────────────────────────

export const ACTIVITY_LANES = ['Client', 'Recruit', 'Both', 'Referral', 'Training'] as const;
export const OUTCOMES = ['No Answer', 'Left VM', 'Text Sent', 'Conversation', 'Appointment Set', 'Not Interested'] as const;
export const ATTEMPT_TYPES = ['Call', 'Text', 'DM', 'Email', 'In Person', 'Zoom'] as const;
export const TASK_STATUSES = ['Open', 'Follow-up', 'Scheduled', 'Completed', 'Nurture', 'Closed'] as const;
export const APPOINTMENT_STATUSES = ['Scheduled', 'Confirmed', 'Held', 'No Show', 'Rescheduled'] as const;
export const RECRUITING_STATUSES = ['Prospect', 'Invited', 'Interviewed', 'IBA Submitted', 'POL Active', 'Licensed'] as const;
export const LICENSING_STATUSES = ['Not Started', 'Course Started', 'Course Complete', 'Exam Scheduled', 'Passed', 'Licensed'] as const;
export const TRAINING_STAGES = ['Observe', 'Open', 'Run Section', 'Lead Appointment', 'Debrief', 'Teach Back'] as const;

/** `''` is "not answered", which is not the same as "N". */
export type YesNo = '' | 'Y' | 'N';

export type OperationalLane = (typeof OPERATIONAL_LANES)[number];
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

// ── Records ──────────────────────────────────────────────────────────────────

export const RECORD_TYPES = {
  contact: 'FS_CONTACT',
  activity: 'FS_ACTIVITY',
  appointment: 'FS_APPOINTMENT',
  recruit: 'FS_RECRUIT',
  licensing: 'FS_LICENSING',
  training: 'FS_TRAINING',
  referral: 'FS_REFERRAL',
  weekly: 'FS_WEEKLY_REVIEW',
} as const;

export type EntityKind = keyof typeof RECORD_TYPES;

export interface MachoFlags {
  /** Married / divorced */
  m: YesNo;
  /** Age 25–55 */
  a: YesNo;
  /** Children under 18 */
  c: YesNo;
  /** Homeowner / in area 3+ years */
  h: YesNo;
  /** Occupation $35k+ */
  o: YesNo;
}

export interface ContactData {
  contactId: string;
  displayName: string;
  firstName: string;
  lastName: string;
  primaryEmail: string;
  allEmails: string;
  primaryPhone: string;
  allPhones: string;
  company: string;
  jobTitle: string;
  relationshipType: string;
  operationalLane: OperationalLane;
  clientInterest: string;
  opportunityInterest: string;
  consentStatus: ConsentStatus;
  contactStatus: ContactStatus;
  source: string;
  state: string;
  lastContacted: string;
  nextFollowUp: string;
  preferredContactMethod: string;
  nextAction: string;
  notes: string;
  /** Reference to the record in the company-approved system. A reference, never a copy. */
  officialCrmRef: string;
  clickUpTaskId: string;
  clickUpTaskUrl: string;
  /** Google Contacts' permanent key — the upsert key on re-import. Never edited by hand. */
  googleResourceName: string;
  googleEtag: string;
  googleUpdatedAt: string;
  syncStatus: string;
  syncError: string;
  sensitiveDataPresent: boolean;
  macho: MachoFlags;
  priority: string;
  businessMotivation: string;
  licensedProspectRef: string;
  recruitProspectRef: string;
}

/** Pipeline rows can name a contact. `contactRecordId` is set only on an exact pick, never guessed. */
export interface ContactLink {
  prospect: string;
  contactRecordId: string;
}

export interface ActivityData extends ContactLink {
  date: string;
  rep: string;
  lane: string;
  source: string;
  attemptType: string;
  outcome: string;
  conversation: YesNo;
  appointmentSet: YesNo;
  appointmentDate: string;
  referralCount: MaybeNumber;
  nextAction: string;
  status: string;
  notes: string;
}

export interface AppointmentData extends ContactLink {
  appointmentDate: string;
  rep: string;
  type: string;
  presentation: string;
  status: string;
  outcome: string;
  referralCount: MaybeNumber;
  followUpDate: string;
  nextAction: string;
  clientResult: string;
  recruitResult: string;
  notes: string;
}

export interface RecruitData extends ContactLink {
  source: string;
  businessMotivation: string;
  status: string;
  invitedDate: string;
  interviewDate: string;
  ibaDate: string;
  polActive: YesNo;
  trainer: string;
  first24HrAction: string;
  fieldExposure72Hr: string;
  nextStep: string;
  priority: string;
  notes: string;
}

export interface LicensingData {
  associate: string;
  state: string;
  startDate: string;
  coursePct: MaybeNumber;
  status: string;
  examDate: string;
  passedDate: string;
  licenseActive: YesNo;
  polActive: YesNo;
  studyBlock: string;
  trainer: string;
  nextAction: string;
  notes: string;
}

export interface TrainingData {
  associate: string;
  trainer: string;
  appointmentCount: MaybeNumber;
  lastAppointment: string;
  currentStage: string;
  nextSkill: string;
  nextFieldDate: string;
  canInvite: YesNo;
  canOpen: YesNo;
  canCloseForAppt: YesNo;
  canDebrief: YesNo;
  notes: string;
}

export interface ReferralData {
  date: string;
  referralSource: string;
  referralName: string;
  triggerMoment: string;
  lane: string;
  reasonGiven: string;
  introMethod: string;
  status: string;
  assignedTo: string;
  followUpDate: string;
  outcome: string;
  nextAction: string;
  notes: string;
}

/** The parts of a weekly review a log cannot compute: client apps, the bottleneck, the coaching. */
export interface WeeklyReviewData {
  weekStart: string;
  rep: string;
  clientApps: MaybeNumber;
  biggestBottleneck: string;
  coachAction: string;
  notes: string;
}

export interface EntityDataMap {
  contact: ContactData;
  activity: ActivityData;
  appointment: AppointmentData;
  recruit: RecruitData;
  licensing: LicensingData;
  training: TrainingData;
  referral: ReferralData;
  weekly: WeeklyReviewData;
}

export type AnyEntityData = EntityDataMap[EntityKind];
export type CrmRecord = GovernedRecord<AnyEntityData>;
export type Contact = GovernedRecord<ContactData>;
export type EntityRecord<K extends EntityKind> = GovernedRecord<EntityDataMap[K]>;
