/**
 * Turn spreadsheet rows into contacts, and plan how they land in the CRM.
 *
 * Reads this CRM's own `CRM Contact Master` sheet and a Google Contacts CSV
 * export. The rules are the workbook's Compliance Notes, enforced rather than
 * remembered:
 *
 * - **Neutral import.** A new contact enters Unqualified / Not Established /
 *   Not Assessed unless the file itself carries a valid classification.
 * - **Upsert by Google Resource Name first.** Never merge on a name alone; a
 *   row that cannot be matched on a stable key is a new contact, and the
 *   duplicate check puts it in front of a human.
 * - **Identity is Google-owned, classification is human-owned.** Re-importing
 *   refreshes names, emails and phones; it never overwrites a lane, consent,
 *   interest, note or follow-up someone set on purpose.
 * - **No automated deletion.** A contact missing from the file stays.
 */
import { emptyContact } from './defaults.ts';
import { detectSensitive } from './crm.ts';
import { excelSerialToIso, type Sheet, type Workbook } from './sheets.ts';
import {
  BUSINESS_MOTIVATIONS,
  CONSENT_STATUSES,
  CONTACT_METHODS,
  CONTACT_STATUSES,
  INTEREST_LEVELS,
  OPERATIONAL_LANES,
  PRIORITIES,
  RELATIONSHIP_TYPES,
  SOURCES,
  SYNC_STATUSES,
  type ContactData,
  type YesNo,
} from './types.ts';

type StringField = { [K in keyof ContactData]: ContactData[K] extends string ? K : never }[keyof ContactData];
type Target = StringField | 'sensitiveDataPresent' | 'macho.m' | 'macho.a' | 'macho.c' | 'macho.h' | 'macho.o';

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Header spellings → field. Both this workbook's headers and Google Contacts' CSV export. */
const HEADER_ALIASES: Record<string, Target> = {
  contactid: 'contactId',
  contact: 'displayName',
  name: 'displayName',
  fullname: 'displayName',
  displayname: 'displayName',
  firstname: 'firstName',
  givenname: 'firstName',
  lastname: 'lastName',
  familyname: 'lastName',
  primaryemail: 'primaryEmail',
  email: 'primaryEmail',
  emailaddress: 'primaryEmail',
  email1value: 'primaryEmail',
  allemails: 'allEmails',
  primaryphone: 'primaryPhone',
  phone: 'primaryPhone',
  phonehandle: 'primaryPhone',
  mobile: 'primaryPhone',
  phone1value: 'primaryPhone',
  allphones: 'allPhones',
  company: 'company',
  organization: 'company',
  organizationname: 'company',
  organization1name: 'company',
  jobtitle: 'jobTitle',
  title: 'jobTitle',
  organizationtitle: 'jobTitle',
  organization1title: 'jobTitle',
  relationshiptype: 'relationshipType',
  relationship: 'relationshipType',
  operationallane: 'operationalLane',
  clientinterest: 'clientInterest',
  opportunityinterest: 'opportunityInterest',
  consentstatus: 'consentStatus',
  contactstatus: 'contactStatus',
  source: 'source',
  state: 'state',
  lastcontacted: 'lastContacted',
  lastcontact: 'lastContacted',
  nextfollowup: 'nextFollowUp',
  preferredcontactmethod: 'preferredContactMethod',
  nextaction: 'nextAction',
  notes: 'notes',
  officialcrmref: 'officialCrmRef',
  clickuptaskid: 'clickUpTaskId',
  clickuptaskurl: 'clickUpTaskUrl',
  googleresourcename: 'googleResourceName',
  resourcename: 'googleResourceName',
  googleetag: 'googleEtag',
  etag: 'googleEtag',
  googleupdatedat: 'googleUpdatedAt',
  syncstatus: 'syncStatus',
  syncerror: 'syncError',
  sensitivedatapresent: 'sensitiveDataPresent',
  m: 'macho.m',
  a: 'macho.a',
  c: 'macho.c',
  h: 'macho.h',
  o: 'macho.o',
  priority: 'priority',
  businessmotivation: 'businessMotivation',
  licensedprospectref: 'licensedProspectRef',
  recruitprospectref: 'recruitProspectRef',
};

/** Fields whose value must come from a fixed list; anything else falls back to the neutral default. */
const ENUMS: Partial<Record<StringField, readonly string[]>> = {
  operationalLane: OPERATIONAL_LANES,
  consentStatus: CONSENT_STATUSES,
  contactStatus: CONTACT_STATUSES,
  clientInterest: INTEREST_LEVELS,
  opportunityInterest: INTEREST_LEVELS,
  relationshipType: RELATIONSHIP_TYPES,
  preferredContactMethod: CONTACT_METHODS,
  syncStatus: SYNC_STATUSES,
  priority: PRIORITIES,
  businessMotivation: BUSINESS_MOTIVATIONS,
  source: SOURCES,
};

const DAY_FIELDS: StringField[] = ['lastContacted', 'nextFollowUp'];

/** Google Contacts owns these; a re-import may refresh them. */
export const IDENTITY_FIELDS = [
  'displayName',
  'firstName',
  'lastName',
  'primaryEmail',
  'allEmails',
  'primaryPhone',
  'allPhones',
  'company',
  'jobTitle',
  'googleEtag',
  'googleUpdatedAt',
] as const satisfies readonly StringField[];

export interface ParsedContacts {
  sheetName: string;
  headerRow: number;
  mappedColumns: string[];
  contacts: ContactData[];
  /** Rows with no name, email or phone -- nothing to identify anyone by. */
  skippedEmpty: number;
  /** Values that were not on the field's list and were replaced by the neutral default. */
  unrecognizedValues: number;
  /** Rows whose notes looked like they held regulated data; flagged, not dropped. */
  flaggedSensitive: number;
}

function headerMap(row: string[]): Map<number, Target> {
  const map = new Map<number, Target>();
  row.forEach((h, i) => {
    const target = HEADER_ALIASES[norm(h ?? '')];
    // First column wins: "E-mail 1 - Value" before "E-mail 2 - Value", etc.
    if (target && ![...map.values()].includes(target)) map.set(i, target);
  });
  return map;
}

function isIdentityHeader(t: Target) {
  return t === 'displayName' || t === 'firstName' || t === 'lastName' || t === 'primaryEmail' || t === 'primaryPhone';
}

/** The header row within the first 15: the one naming the most known fields, at least one of them an identity field. */
function findHeader(rows: Sheet): { index: number; map: Map<number, Target> } | null {
  let best: { index: number; map: Map<number, Target> } | null = null;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const map = headerMap(rows[i] ?? []);
    const hasIdentity = [...map.values()].some(isIdentityHeader);
    if (hasIdentity && map.size >= 2 && (!best || map.size > best.map.size)) best = { index: i, map };
  }
  return best;
}

/** A calendar date as YYYY-MM-DD when it can be read unambiguously; otherwise the text as given. */
export function toDayString(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  if (/^\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    // Plausible Excel serials only (1954–2119); a bare "12" is not a date.
    if (n > 20_000 && n < 80_000) return excelSerialToIso(n).slice(0, 10);
    return s;
  }
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  // Kept as typed. followUpState() reports it as unreadable rather than guessing.
  return s;
}

function toYesNo(raw: string): YesNo {
  const s = raw.trim().toUpperCase();
  if (s === 'Y' || s === 'YES' || s === 'TRUE') return 'Y';
  if (s === 'N' || s === 'NO' || s === 'FALSE') return 'N';
  return '';
}

function rowToContact(row: string[], map: Map<number, Target>, counters: { unrecognized: number }): ContactData {
  const c = emptyContact();
  c.source = 'Google Contacts';
  c.syncStatus = 'Imported';
  for (const [i, target] of map) {
    const raw = (row[i] ?? '').trim();
    if (!raw) continue;
    if (target === 'sensitiveDataPresent') {
      c.sensitiveDataPresent = toYesNo(raw) === 'Y';
    } else if (target.startsWith('macho.')) {
      c.macho[target.slice(6) as keyof ContactData['macho']] = toYesNo(raw);
    } else {
      const field = target as StringField;
      const list = ENUMS[field];
      if (list) {
        const match = list.find((v) => v.toLowerCase() === raw.toLowerCase());
        if (match) (c as unknown as Record<string, string>)[field] = match;
        else counters.unrecognized++;
      } else if (DAY_FIELDS.includes(field)) {
        (c as unknown as Record<string, string>)[field] = toDayString(raw);
      } else if (field === 'googleUpdatedAt' && /^\d+(\.\d+)?$/.test(raw)) {
        c.googleUpdatedAt = excelSerialToIso(Number(raw));
      } else {
        (c as unknown as Record<string, string>)[field] = raw;
      }
    }
  }
  if (!c.displayName) c.displayName = [c.firstName, c.lastName].filter(Boolean).join(' ');
  if (!c.allEmails) c.allEmails = c.primaryEmail;
  if (!c.allPhones) c.allPhones = c.primaryPhone;
  return c;
}

export const CONTACT_SHEET = 'CRM Contact Master';

/** Pick the contact sheet (this CRM's own by name, else the first with a usable header) and read it. */
export function parseContacts(book: Workbook): ParsedContacts {
  const ordered = [...book.filter((s) => s.name === CONTACT_SHEET), ...book.filter((s) => s.name !== CONTACT_SHEET)];
  for (const sheet of ordered) {
    const header = findHeader(sheet.rows);
    if (!header) continue;
    const counters = { unrecognized: 0 };
    const contacts: ContactData[] = [];
    let skippedEmpty = 0;
    let flaggedSensitive = 0;
    for (const row of sheet.rows.slice(header.index + 1)) {
      if (!row || row.every((v) => !v || !v.trim())) continue;
      const c = rowToContact(row, header.map, counters);
      if (!c.displayName && !c.primaryEmail && !c.primaryPhone) {
        skippedEmpty++;
        continue;
      }
      if (!c.sensitiveDataPresent && detectSensitive(c.notes).length > 0) {
        c.sensitiveDataPresent = true;
        flaggedSensitive++;
      }
      contacts.push(c);
    }
    return {
      sheetName: sheet.name,
      headerRow: header.index + 1,
      mappedColumns: [...header.map.entries()].map(([i]) => sheet.rows[header.index][i]),
      contacts,
      skippedEmpty,
      unrecognizedValues: counters.unrecognized,
      flaggedSensitive,
    };
  }
  throw new Error('No sheet with a recognizable contact header (Contact / Name / First Name with Email or Phone) was found.');
}

// ── Planning ─────────────────────────────────────────────────────────────────

export interface ImportPlan {
  creates: ContactData[];
  updates: { id: string; data: ContactData; changed: string[] }[];
  unchanged: number;
  /** Rows repeating a Google Resource Name already seen earlier in the same file. */
  repeatedInFile: number;
}

function nextIdAllocator(existing: string[]) {
  let max = 0;
  for (const id of existing) {
    const m = /^FS-(\d+)$/.exec(id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const taken = new Set(existing);
  return (wanted: string): string => {
    if (wanted && !taken.has(wanted)) {
      taken.add(wanted);
      const m = /^FS-(\d+)$/.exec(wanted);
      if (m) max = Math.max(max, Number(m[1]));
      return wanted;
    }
    let id: string;
    do id = `FS-${String(++max).padStart(4, '0')}`;
    while (taken.has(id));
    taken.add(id);
    return id;
  };
}

const sameName = (a: ContactData, b: ContactData) => a.displayName.trim().toLowerCase() === b.displayName.trim().toLowerCase();

/**
 * Match each incoming contact to an existing one by Google Resource Name, or
 * -- for a row with none -- by Contact ID confirmed by the same name. Anything
 * else is created. Nothing is deleted.
 */
export function planImport(existing: { id: string; data: ContactData }[], incoming: ContactData[]): ImportPlan {
  const byResource = new Map<string, { id: string; data: ContactData }>();
  const byContactId = new Map<string, { id: string; data: ContactData }>();
  for (const e of existing) {
    if (e.data.googleResourceName) byResource.set(e.data.googleResourceName, e);
    if (e.data.contactId) byContactId.set(e.data.contactId, e);
  }
  const allocate = nextIdAllocator(existing.map((e) => e.data.contactId).filter(Boolean));

  const plan: ImportPlan = { creates: [], updates: [], unchanged: 0, repeatedInFile: 0 };
  const seenResource = new Set<string>();

  for (const row of incoming) {
    if (row.googleResourceName) {
      if (seenResource.has(row.googleResourceName)) {
        plan.repeatedInFile++;
        continue;
      }
      seenResource.add(row.googleResourceName);
    }

    let match = row.googleResourceName ? byResource.get(row.googleResourceName) : undefined;
    if (!match && !row.googleResourceName && row.contactId) {
      const candidate = byContactId.get(row.contactId);
      if (candidate && !candidate.data.googleResourceName && sameName(candidate.data, row)) match = candidate;
    }

    if (match) {
      const changed = IDENTITY_FIELDS.filter((f) => row[f] !== '' && row[f] !== match!.data[f]);
      if (changed.length === 0) {
        plan.unchanged++;
        continue;
      }
      const data: ContactData = { ...match.data };
      for (const f of changed) data[f] = row[f];
      data.syncStatus = 'Synced';
      data.syncError = '';
      plan.updates.push({ id: match.id, data, changed });
      continue;
    }

    plan.creates.push({ ...row, contactId: allocate(row.contactId) });
  }
  return plan;
}

// ── Export ───────────────────────────────────────────────────────────────────

/** Columns for CSV export, in the workbook's CRM Contact Master order, so a round trip re-imports cleanly. */
export const EXPORT_COLUMNS: { header: string; get: (c: ContactData) => string | boolean }[] = [
  { header: 'Contact ID', get: (c) => c.contactId },
  { header: 'Contact', get: (c) => c.displayName },
  { header: 'First Name', get: (c) => c.firstName },
  { header: 'Last Name', get: (c) => c.lastName },
  { header: 'Primary Email', get: (c) => c.primaryEmail },
  { header: 'All Emails', get: (c) => c.allEmails },
  { header: 'Primary Phone', get: (c) => c.primaryPhone },
  { header: 'All Phones', get: (c) => c.allPhones },
  { header: 'Company', get: (c) => c.company },
  { header: 'Job Title', get: (c) => c.jobTitle },
  { header: 'Relationship Type', get: (c) => c.relationshipType },
  { header: 'Operational Lane', get: (c) => c.operationalLane },
  { header: 'Client Interest', get: (c) => c.clientInterest },
  { header: 'Opportunity Interest', get: (c) => c.opportunityInterest },
  { header: 'Consent Status', get: (c) => c.consentStatus },
  { header: 'Contact Status', get: (c) => c.contactStatus },
  { header: 'Source', get: (c) => c.source },
  { header: 'State', get: (c) => c.state },
  { header: 'Last Contacted', get: (c) => c.lastContacted },
  { header: 'Next Follow-Up', get: (c) => c.nextFollowUp },
  { header: 'Preferred Contact Method', get: (c) => c.preferredContactMethod },
  { header: 'Next Action', get: (c) => c.nextAction },
  { header: 'Notes', get: (c) => c.notes },
  { header: 'Official CRM Ref', get: (c) => c.officialCrmRef },
  { header: 'ClickUp Task ID', get: (c) => c.clickUpTaskId },
  { header: 'ClickUp Task URL', get: (c) => c.clickUpTaskUrl },
  { header: 'Google Resource Name', get: (c) => c.googleResourceName },
  { header: 'Google ETag', get: (c) => c.googleEtag },
  { header: 'Google Updated At', get: (c) => c.googleUpdatedAt },
  { header: 'Sync Status', get: (c) => c.syncStatus },
  { header: 'Sync Error', get: (c) => c.syncError },
  { header: 'Sensitive Data Present', get: (c) => (c.sensitiveDataPresent ? 'TRUE' : 'FALSE') },
  { header: 'M', get: (c) => c.macho.m },
  { header: 'A', get: (c) => c.macho.a },
  { header: 'C', get: (c) => c.macho.c },
  { header: 'H', get: (c) => c.macho.h },
  { header: 'O', get: (c) => c.macho.o },
  { header: 'Priority', get: (c) => c.priority },
  { header: 'Business Motivation', get: (c) => c.businessMotivation },
  { header: 'Licensed Prospect Ref', get: (c) => c.licensedProspectRef },
  { header: 'Recruit Prospect Ref', get: (c) => c.recruitProspectRef },
];

export function contactsToRows(contacts: ContactData[]): (string | boolean)[][] {
  return [EXPORT_COLUMNS.map((c) => c.header), ...contacts.map((c) => EXPORT_COLUMNS.map((col) => col.get(c)))];
}
