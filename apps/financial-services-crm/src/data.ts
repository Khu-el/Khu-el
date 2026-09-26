/**
 * Playbook content, carried over verbatim from the source workbook's Scripts
 * Library, Objection Matrix, Compliance Notes and CRM Data Dictionary sheets.
 * This is the canonical copy in the app: edit wording here, not in a component.
 */

/** The workbook's "Saturday Training Activity Standard" / daily production standard. */
export const DAILY_TARGETS = { dials: 25, conversations: 8, appointments: 2, sprint: '30 min' } as const;

export const TARGET_MEANINGS: { metric: string; target: number; meaning: string }[] = [
  { metric: 'Dials', target: DAILY_TARGETS.dials, meaning: 'Own the input volume.' },
  { metric: 'Conversations', target: DAILY_TARGETS.conversations, meaning: 'Convert attempts into real engagement.' },
  { metric: 'Appointments Set', target: DAILY_TARGETS.appointments, meaning: 'Secure a confirmed date/time.' },
];

export const SCRIPTS: { scenario: string; goal: string; script: string; close: string; notes: string }[] = [
  {
    scenario: 'Warm Market Check-In',
    goal: 'Set a 15-minute appointment',
    script: 'Hey [Name], quick question — I’m setting a few appointments for next week and thought about you. I wanted to see if you had about 15 minutes so we can catch up and I can show you what I’m working on.',
    close: 'Does Tuesday evening or Thursday evening work better?',
    notes: 'Keep it short. Do not present on the call.',
  },
  {
    scenario: 'Re-Engagement',
    goal: 'Restart a conversation',
    script: 'Hey [Name], it’s been a minute. I was going through some things today and thought about you. I wanted to reconnect and show you a couple things we’ve been helping families look at.',
    close: 'Do you have 15 minutes tomorrow around 6?',
    notes: 'Use only appropriate/approved descriptions.',
  },
  {
    scenario: 'Opportunity Referral',
    goal: 'Ask for business candidates',
    script: 'Quick question — I’m expanding locally and looking for a few sharp people who keep their options open when it comes to additional income or business.',
    close: 'Who’s the first person that comes to mind?',
    notes: 'Separate opportunity and client lanes.',
  },
  {
    scenario: 'Client Referral',
    goal: 'Ask for family/client leads',
    script: 'Quick question — I’m expanding my client base locally and looking for families who haven’t reviewed their protection lately.',
    close: 'Who’s the first person that comes to mind?',
    notes: 'Ask after a value moment.',
  },
  {
    scenario: 'Training Appointment',
    goal: 'Field train new associate',
    script: 'I’m getting licensed/trained and part of my development is sitting with my trainer for a few practice appointments. You don’t have to buy anything; it would help me just to have you see what we’re learning.',
    close: 'Would you be open to helping me this week?',
    notes: 'Great for new associates.',
  },
];

export const OBJECTIONS: { objection: string; acknowledge: string; pivot: string; close: string; avoid: string; notes: string }[] = [
  {
    objection: 'I’m too busy right now.',
    acknowledge: 'I completely respect that — I know your schedule is stacked.',
    pivot: 'That’s exactly why I’m calling ahead. It only takes 15 minutes over Zoom or phone.',
    close: 'Would early next week work, or are weekend mornings better?',
    avoid: 'Don’t argue about their schedule.',
    notes: 'Sell the appointment, not the whole business.',
  },
  {
    objection: 'Just send me an email.',
    acknowledge: 'I can definitely send general information.',
    pivot: 'Everyone’s situation is different, so a generic email won’t tailor anything to your goals.',
    close: 'Let’s take 10 minutes Tuesday. Does 5:30 or 7 work better?',
    avoid: 'Don’t let email replace the conversation.',
    notes: 'Send info if appropriate, but still seek the appointment.',
  },
  {
    objection: 'I already have a plan in place.',
    acknowledge: 'That’s great. Having something set up puts you ahead of a lot of people.',
    pivot: 'This may simply confirm that what you have still fits what you want it to accomplish.',
    close: 'Would Thursday around 6 work for a quick review?',
    avoid: 'Don’t attack their current plan.',
    notes: 'Use review/second look language carefully.',
  },
  {
    objection: 'I need to think about it.',
    acknowledge: 'That makes sense. You should feel good about any decision you make.',
    pivot: 'Usually the best way to think clearly is to get the facts in front of you first.',
    close: 'Let’s schedule 15 minutes, then you can decide if it makes sense.',
    avoid: 'Don’t pressure.',
    notes: 'Lower resistance.',
  },
];

export const COMPLIANCE_GUARDRAILS: { area: string; rule: string }[] = [
  { area: 'Income examples', rule: 'Use only current, approved disclosures and avoid implying typical or guaranteed earnings.' },
  { area: 'Licensing', rule: 'Only discuss/recommend products within current licensing and company authorization.' },
  { area: 'Securities/investments', rule: 'Route securities-specific recommendations and transactions to appropriately registered representatives.' },
  { area: 'Company statistics', rule: 'Refresh from current Primerica disclosures/investor materials before presenting externally.' },
  { area: 'AI/automation', rule: 'Use for organization, reminders, scripting, and admin support — not to replace compliance, supervision, or regulated advice.' },
];

export const CRM_GOVERNANCE_RULES: { rule: string; meaning: string }[] = [
  { rule: 'Neutral import', meaning: 'Every Google Contact enters as Unqualified / Not Established; no automatic solicitation classification.' },
  { rule: 'Commercial routing', meaning: 'Licensed Prospect or Recruiting lane requires intentional qualification/interest.' },
  { rule: 'System of record', meaning: 'Regulated applications, products, underwriting, policy/customer records remain in company-approved systems.' },
  { rule: 'Sensitive data', meaning: 'Do not store SSNs, bank/account info, policy numbers, detailed medical/underwriting data, or government ID images here.' },
  { rule: 'ClickUp execution', meaning: 'Create ClickUp work only when a concrete next action exists; do not create tasks for every contact.' },
  { rule: 'Sync safety', meaning: 'Upsert by Google Resource Name first; do not fuzzy-merge by name alone; no automated destructive deletion.' },
];

export const DATA_DICTIONARY: { field: string; purpose: string; owner: string; rule: string; notes: string }[] = [
  { field: 'Google Resource Name', purpose: 'Permanent sync key', owner: 'Google Contacts', rule: 'Do not manually edit', notes: 'Primary dedup/upsert key.' },
  { field: 'Primary Email / Phone', purpose: 'Contact identity fields', owner: 'Google Contacts', rule: 'Google-owned', notes: 'Operational system should not overwrite without explicit action.' },
  { field: 'Operational Lane', purpose: 'Routing classification', owner: 'CRM / human', rule: 'Intentional qualification only', notes: 'Unqualified, General Network, Licensed Prospect, Recruiting, Mixed, Suppressed.' },
  { field: 'Client Interest', purpose: 'Client-side interest', owner: 'CRM / human', rule: 'Do not infer from address book presence', notes: 'Used to route only after legitimate interaction.' },
  { field: 'Opportunity Interest', purpose: 'Business opportunity interest', owner: 'CRM / human', rule: 'Do not infer', notes: 'Supports recruiting workflow.' },
  { field: 'Consent Status', purpose: 'Permission state', owner: 'CRM / human', rule: 'Must be intentionally established', notes: 'Address-book presence alone is not commercial consent.' },
  { field: 'Contact Status', purpose: 'Relationship workflow status', owner: 'CRM / human', rule: 'Operational', notes: 'Active, Follow-Up, Nurture, Closed, Suppressed, Sync Exception.' },
  { field: 'Next Follow-Up', purpose: 'Action due date', owner: 'CRM / human', rule: 'Create only when an action exists', notes: 'Can later drive ClickUp tasks.' },
  { field: 'Official CRM Ref', purpose: 'Reference to company-approved record', owner: 'Company-approved system', rule: 'Reference only', notes: 'Do not copy sensitive regulated data into this CRM.' },
  { field: 'ClickUp Task ID / URL', purpose: 'Execution linkage', owner: 'ClickUp', rule: 'Action-only', notes: 'No ClickUp task for passive contacts.' },
  { field: 'M/A/C/H/O', purpose: 'Target-market qualification', owner: 'CRM / human', rule: 'Manual assessment', notes: 'Married/divorced; Age 25–55; Children under 18; Homeowner/area 3+ yrs; Occupation $35k+.' },
  { field: 'MACHO Score', purpose: 'Qualification count', owner: 'Formula', rule: 'Count of Y across M-A-C-H-O', notes: '0–5; not a compliance or eligibility decision.' },
  { field: 'Sync Status / Error', purpose: 'Integration health', owner: 'Automation', rule: 'System-maintained', notes: 'Used for exception handling.' },
  { field: 'Sensitive Data Present', purpose: 'Data-governance flag', owner: 'CRM / human', rule: 'Should normally be FALSE', notes: 'Do not store SSN, bank data, policy IDs, underwriting or medical details.' },
];

export const MACHO_LABELS: { key: 'm' | 'a' | 'c' | 'h' | 'o'; letter: string; meaning: string }[] = [
  { key: 'm', letter: 'M', meaning: 'Married / divorced' },
  { key: 'a', letter: 'A', meaning: 'Age 25–55' },
  { key: 'c', letter: 'C', meaning: 'Children under 18' },
  { key: 'h', letter: 'H', meaning: 'Homeowner / in area 3+ years' },
  { key: 'o', letter: 'O', meaning: 'Occupation $35k+' },
];
