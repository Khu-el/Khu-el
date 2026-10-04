import {
  ACTIVITY_LANES,
  APPOINTMENT_STATUSES,
  ATTEMPT_TYPES,
  BUSINESS_MOTIVATIONS,
  LICENSING_STATUSES,
  OUTCOMES,
  PRIORITIES,
  RECRUITING_STATUSES,
  SOURCES,
  TASK_STATUSES,
  TRAINING_STAGES,
  type EntityDataMap,
  type EntityKind,
} from './types';

/**
 * Field layouts for the pipeline sheets, column for column with the source
 * workbook. One generic tab renders all of them, so a sheet change is a change
 * here rather than in a component.
 */

export type FieldKind = 'text' | 'longtext' | 'date' | 'number' | 'select' | 'yesno' | 'contact';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: readonly string[];
  /** Shown as a table column. */
  column?: boolean;
  hint?: string;
}

export type PipelineKind = Exclude<EntityKind, 'contact' | 'weekly'>;

export interface EntityConfig<K extends PipelineKind = PipelineKind> {
  kind: K;
  title: string;
  subtitle: string;
  addLabel: string;
  fields: FieldDef[];
  /** Field the status filter and counts use. */
  statusKey: string;
  statusOptions: readonly string[];
  /** Field rows sort by (descending) and the follow-up badge reads. */
  dateKey: string;
  followUpKey?: string;
  label: (d: EntityDataMap[K]) => string;
}

const contact = (label = 'Prospect'): FieldDef => ({ key: 'prospect', label, kind: 'contact', column: true, hint: 'Pick from contacts to link the record; free text is kept unlinked.' });

export const ENTITY_CONFIGS: { [K in PipelineKind]: EntityConfig<K> } = {
  activity: {
    kind: 'activity',
    title: 'Activity Log',
    subtitle: 'Log every attempt. This is the source for daily and weekly production ratios.',
    addLabel: 'Log attempt',
    statusKey: 'status',
    statusOptions: TASK_STATUSES,
    dateKey: 'date',
    label: (d) => d.prospect || 'Unnamed prospect',
    fields: [
      { key: 'date', label: 'Date', kind: 'date', column: true },
      { key: 'rep', label: 'Rep', kind: 'text', column: true },
      contact(),
      { key: 'lane', label: 'Lane', kind: 'select', options: ACTIVITY_LANES, column: true },
      { key: 'source', label: 'Source', kind: 'select', options: SOURCES },
      { key: 'attemptType', label: 'Attempt Type', kind: 'select', options: ATTEMPT_TYPES, column: true },
      { key: 'outcome', label: 'Outcome', kind: 'select', options: OUTCOMES, column: true },
      { key: 'conversation', label: 'Conversation?', kind: 'yesno', column: true },
      { key: 'appointmentSet', label: 'Appointment Set?', kind: 'yesno', column: true },
      { key: 'appointmentDate', label: 'Appointment Date', kind: 'date' },
      { key: 'referralCount', label: 'Referral Count', kind: 'number' },
      { key: 'nextAction', label: 'Next Action', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'select', options: TASK_STATUSES, column: true },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
  appointment: {
    kind: 'appointment',
    title: 'Appointment Pipeline',
    subtitle: 'Track what is scheduled, held, rescheduled, and converted.',
    addLabel: 'Add appointment',
    statusKey: 'status',
    statusOptions: APPOINTMENT_STATUSES,
    dateKey: 'appointmentDate',
    followUpKey: 'followUpDate',
    label: (d) => d.prospect || 'Unnamed prospect',
    fields: [
      { key: 'appointmentDate', label: 'Appointment Date', kind: 'date', column: true },
      contact(),
      { key: 'rep', label: 'Rep / Trainer', kind: 'text', column: true },
      { key: 'type', label: 'Type', kind: 'select', options: ACTIVITY_LANES, column: true },
      { key: 'presentation', label: 'Presentation', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'select', options: APPOINTMENT_STATUSES, column: true },
      { key: 'outcome', label: 'Outcome', kind: 'text', column: true },
      { key: 'referralCount', label: 'Referral Count', kind: 'number' },
      { key: 'followUpDate', label: 'Follow-Up Date', kind: 'date', column: true },
      { key: 'nextAction', label: 'Next Action', kind: 'text' },
      { key: 'clientResult', label: 'Client Result', kind: 'text' },
      { key: 'recruitResult', label: 'Recruit Result', kind: 'text' },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
  recruit: {
    kind: 'recruit',
    title: 'Recruiting Funnel',
    subtitle: 'Move people from curiosity to IBA, licensing, field training, and leadership.',
    addLabel: 'Add recruit',
    statusKey: 'status',
    statusOptions: RECRUITING_STATUSES,
    dateKey: 'invitedDate',
    label: (d) => d.prospect || 'Unnamed prospect',
    fields: [
      contact(),
      { key: 'source', label: 'Source', kind: 'select', options: SOURCES },
      { key: 'businessMotivation', label: 'Business Motivation', kind: 'select', options: BUSINESS_MOTIVATIONS, column: true },
      { key: 'status', label: 'Status', kind: 'select', options: RECRUITING_STATUSES, column: true },
      { key: 'invitedDate', label: 'Invited Date', kind: 'date', column: true },
      { key: 'interviewDate', label: 'Interview Date', kind: 'date' },
      { key: 'ibaDate', label: 'IBA Date', kind: 'date', column: true },
      { key: 'polActive', label: 'POL Active?', kind: 'yesno', column: true },
      { key: 'trainer', label: 'Trainer', kind: 'text', column: true },
      { key: 'first24HrAction', label: 'First 24-Hr Action', kind: 'text' },
      { key: 'fieldExposure72Hr', label: '72-Hr Field Exposure', kind: 'text' },
      { key: 'nextStep', label: 'Next Step', kind: 'text' },
      { key: 'priority', label: 'Priority', kind: 'select', options: PRIORITIES, column: true },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
  licensing: {
    kind: 'licensing',
    title: 'Licensing Tracker',
    subtitle: 'Track licensing progress and remove friction fast.',
    addLabel: 'Add associate',
    statusKey: 'status',
    statusOptions: LICENSING_STATUSES,
    dateKey: 'startDate',
    label: (d) => d.associate || 'Unnamed associate',
    fields: [
      { key: 'associate', label: 'Associate', kind: 'text', column: true },
      { key: 'state', label: 'State', kind: 'text', column: true },
      { key: 'startDate', label: 'Start Date', kind: 'date', column: true },
      { key: 'coursePct', label: 'Course %', kind: 'number', column: true, hint: '0–100, as reported by the course.' },
      { key: 'status', label: 'Status', kind: 'select', options: LICENSING_STATUSES, column: true },
      { key: 'examDate', label: 'Exam Date', kind: 'date', column: true },
      { key: 'passedDate', label: 'Passed Date', kind: 'date' },
      { key: 'licenseActive', label: 'License Active?', kind: 'yesno', column: true, hint: 'Confirm against the state regulator or company system — this field records what you confirmed, it does not verify it.' },
      { key: 'polActive', label: 'POL Active?', kind: 'yesno' },
      { key: 'studyBlock', label: 'Study Block', kind: 'text' },
      { key: 'trainer', label: 'Trainer', kind: 'text' },
      { key: 'nextAction', label: 'Next Action', kind: 'text' },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
  training: {
    kind: 'training',
    title: 'Field Training Progression',
    subtitle: 'Move associates from observer to teacher.',
    addLabel: 'Add associate',
    statusKey: 'currentStage',
    statusOptions: TRAINING_STAGES,
    dateKey: 'nextFieldDate',
    label: (d) => d.associate || 'Unnamed associate',
    fields: [
      { key: 'associate', label: 'Associate', kind: 'text', column: true },
      { key: 'trainer', label: 'Trainer', kind: 'text', column: true },
      { key: 'appointmentCount', label: 'Appointment Count', kind: 'number', column: true },
      { key: 'lastAppointment', label: 'Last Appointment', kind: 'date' },
      { key: 'currentStage', label: 'Current Stage', kind: 'select', options: TRAINING_STAGES, column: true },
      { key: 'nextSkill', label: 'Next Skill', kind: 'text' },
      { key: 'nextFieldDate', label: 'Next Field Date', kind: 'date', column: true },
      { key: 'canInvite', label: 'Can Invite?', kind: 'yesno', column: true },
      { key: 'canOpen', label: 'Can Open?', kind: 'yesno', column: true },
      { key: 'canCloseForAppt', label: 'Can Close for Appt?', kind: 'yesno', column: true },
      { key: 'canDebrief', label: 'Can Debrief?', kind: 'yesno', column: true },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
  referral: {
    kind: 'referral',
    title: 'Referral Engine',
    subtitle: 'Ask for referrals after value moments, not as a cold favor.',
    addLabel: 'Add referral',
    statusKey: 'status',
    statusOptions: TASK_STATUSES,
    dateKey: 'date',
    followUpKey: 'followUpDate',
    label: (d) => d.referralName || 'Unnamed referral',
    fields: [
      { key: 'date', label: 'Date', kind: 'date', column: true },
      { key: 'referralSource', label: 'Referral Source', kind: 'text', column: true },
      { key: 'referralName', label: 'Referral Name', kind: 'text', column: true },
      { key: 'triggerMoment', label: 'Trigger Moment', kind: 'text' },
      { key: 'lane', label: 'Lane', kind: 'select', options: ACTIVITY_LANES, column: true },
      { key: 'reasonGiven', label: 'Reason Given', kind: 'text' },
      { key: 'introMethod', label: 'Intro Method', kind: 'text' },
      { key: 'status', label: 'Status', kind: 'select', options: TASK_STATUSES, column: true },
      { key: 'assignedTo', label: 'Assigned To', kind: 'text', column: true },
      { key: 'followUpDate', label: 'Follow-Up Date', kind: 'date', column: true },
      { key: 'outcome', label: 'Outcome', kind: 'text' },
      { key: 'nextAction', label: 'Next Action', kind: 'text' },
      { key: 'notes', label: 'Notes', kind: 'longtext' },
    ],
  },
};
