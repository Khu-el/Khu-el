/**
 * Blank data for every record kind. Pure, so the importer and its tests share it.
 *
 * A new contact starts neutral -- Unqualified, Not Established, Not Assessed --
 * exactly as the workbook's Import Audit sets its defaults. Nothing about a
 * person's interest or permission is presumed from their being in an address book.
 */
import type {
  ActivityData,
  AppointmentData,
  ContactData,
  EntityDataMap,
  EntityKind,
  LicensingData,
  RecruitData,
  ReferralData,
  TrainingData,
  WeeklyReviewData,
} from './types.ts';

export function emptyContact(): ContactData {
  return {
    contactId: '',
    displayName: '',
    firstName: '',
    lastName: '',
    primaryEmail: '',
    allEmails: '',
    primaryPhone: '',
    allPhones: '',
    company: '',
    jobTitle: '',
    relationshipType: '',
    operationalLane: 'Unqualified',
    clientInterest: 'Not Assessed',
    opportunityInterest: 'Not Assessed',
    consentStatus: 'Not Established',
    contactStatus: 'Active',
    source: 'Manual',
    state: '',
    lastContacted: '',
    nextFollowUp: '',
    preferredContactMethod: 'Unknown',
    nextAction: '',
    notes: '',
    officialCrmRef: '',
    clickUpTaskId: '',
    clickUpTaskUrl: '',
    googleResourceName: '',
    googleEtag: '',
    googleUpdatedAt: '',
    syncStatus: '',
    syncError: '',
    sensitiveDataPresent: false,
    macho: { m: '', a: '', c: '', h: '', o: '' },
    priority: '',
    businessMotivation: 'Not Assessed',
    licensedProspectRef: '',
    recruitProspectRef: '',
  };
}

const activity = (today: string): ActivityData => ({
  date: today,
  rep: '',
  prospect: '',
  contactRecordId: '',
  lane: 'Client',
  source: '',
  attemptType: 'Call',
  outcome: '',
  conversation: '',
  appointmentSet: '',
  appointmentDate: '',
  referralCount: null,
  nextAction: '',
  status: 'Open',
  notes: '',
});

const appointment = (today: string): AppointmentData => ({
  appointmentDate: today,
  prospect: '',
  contactRecordId: '',
  rep: '',
  type: 'Client',
  presentation: '',
  status: 'Scheduled',
  outcome: '',
  referralCount: null,
  followUpDate: '',
  nextAction: '',
  clientResult: '',
  recruitResult: '',
  notes: '',
});

const recruit = (): RecruitData => ({
  prospect: '',
  contactRecordId: '',
  source: '',
  businessMotivation: 'Not Assessed',
  status: 'Prospect',
  invitedDate: '',
  interviewDate: '',
  ibaDate: '',
  polActive: '',
  trainer: '',
  first24HrAction: '',
  fieldExposure72Hr: '',
  nextStep: '',
  priority: '',
  notes: '',
});

const licensing = (today: string): LicensingData => ({
  associate: '',
  state: '',
  startDate: today,
  coursePct: null,
  status: 'Not Started',
  examDate: '',
  passedDate: '',
  licenseActive: '',
  polActive: '',
  studyBlock: '',
  trainer: '',
  nextAction: '',
  notes: '',
});

const training = (): TrainingData => ({
  associate: '',
  trainer: '',
  appointmentCount: null,
  lastAppointment: '',
  currentStage: 'Observe',
  nextSkill: '',
  nextFieldDate: '',
  canInvite: '',
  canOpen: '',
  canCloseForAppt: '',
  canDebrief: '',
  notes: '',
});

const referral = (today: string): ReferralData => ({
  date: today,
  referralSource: '',
  referralName: '',
  triggerMoment: '',
  lane: 'Client',
  reasonGiven: '',
  introMethod: '',
  status: 'Open',
  assignedTo: '',
  followUpDate: '',
  outcome: '',
  nextAction: '',
  notes: '',
});

const weekly = (weekStart: string): WeeklyReviewData => ({
  weekStart,
  rep: '',
  clientApps: null,
  biggestBottleneck: '',
  coachAction: '',
  notes: '',
});

export function emptyData<K extends EntityKind>(kind: K, today: string, weekStart: string): EntityDataMap[K] {
  const make: { [P in EntityKind]: () => EntityDataMap[P] } = {
    contact: emptyContact,
    activity: () => activity(today),
    appointment: () => appointment(today),
    recruit,
    licensing: () => licensing(today),
    training,
    referral: () => referral(today),
    weekly: () => weekly(weekStart),
  };
  return make[kind]();
}
