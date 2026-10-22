import { createHash } from 'node:crypto';

/**
 * NTE ministry desk rules. Pure functions — the route layer and SQLite store
 * call these, and they do not talk to the network.
 *
 * Lane is fixed. House of Ransom, the Living Trust, and private family records
 * are refused. This is not a second copy of the agent ledger in
 * packages/nvs-agent-desk; that ledger still gates agent actions. This module
 * is the record-level gate for the signed-in desk.
 */

export const LANE = 'NTE_MINISTRY' as const;

/** Working labels only. None of these is a formed legal entity. */
export const DESK_ENTITIES = ['VEI', 'OPS', 'NPE', 'MFG', 'GHC', 'TFS', 'IPI', 'QVI', 'NETWORK'] as const;
export type DeskEntity = (typeof DESK_ENTITIES)[number];
export const FORMATION_STATUS = 'unformed' as const;
export const FORMATION_NOTE = 'Unformed. This record does not assert that a legal entity exists.';

export function resolveEntity(value: unknown): DeskEntity {
  if (value === undefined || value === null || value === '') return 'NETWORK';
  if (typeof value !== 'string' || !(DESK_ENTITIES as readonly string[]).includes(value)) {
    throw new DeskError(400, `entityId must be one of ${DESK_ENTITIES.join(', ')}`);
  }
  return value as DeskEntity;
}

export function entityFromQuery(value: unknown): DeskEntity | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value) {
    throw new DeskError(400, `entity must be one of ${DESK_ENTITIES.join(', ')}`);
  }
  return resolveEntity(value);
}

/** Formation is read from the server, never written by a client. */
export function refuseFormationClaim(body: Record<string, unknown>) {
  if (body.formationStatus !== undefined || body.formed !== undefined || body.legalExistence !== undefined) {
    throw new DeskError(400, 'Formation status is read-only. Every desk entity is unformed; this software does not record legal existence.');
  }
}

export const AUTHORITY = {
  lane: LANE,
  trustee: 'Equity of the Divine Ministries',
  representative: 'Chaz Khu El',
  nte: 'No tax classification is asserted for NTE; working position held pending written counsel confirmation.',
  assertionStatus: 'CURRENT_INTERNAL_MODEL' as const,
  legalStatusVerified: false,
  excluded: ['House of Ransom', 'Living Trust', 'private family records'],
};

export const PROJECT_STATUSES = ['draft', 'active', 'blocked', 'done'] as const;
export const TASK_STATUSES = ['queued', 'in_progress', 'blocked', 'done'] as const;
export const PIPELINE_STAGES = [
  'brief',
  'artifact',
  'qa',
  'release_review',
  'content_handoff',
  'marketing_handoff',
] as const;
export const EVIDENCE = [
  'VERIFIED',
  'SYSTEM_RECORDED',
  'USER_REPORTED',
  'DOCUMENT_STATED',
  'INFERRED',
  'UNKNOWN',
] as const;
export const BRANDS = ['TED', 'NVS'] as const;
export const ASSET_KINDS = ['logo', 'copy', 'color', 'other'] as const;
export const PROVIDERS = ['activepieces', 'composio', 'zapier', 'native'] as const;
export const INTEGRATION_STATES = ['unconfigured', 'configured', 'verified', 'error'] as const;
export const REGULATED_DOMAINS = ['finance', 'insurance', 'legal', 'debt'] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type EvidenceStatus = (typeof EVIDENCE)[number];
export type Brand = (typeof BRANDS)[number];
export type AssetKind = (typeof ASSET_KINDS)[number];
export type Provider = (typeof PROVIDERS)[number];
export type IntegrationState = (typeof INTEGRATION_STATES)[number];
export type RegulatedDomain = (typeof REGULATED_DOMAINS)[number];

export interface EvidenceRef {
  status: EvidenceStatus;
  source: string;
  asOf: string;
  note?: string;
}

export class DeskError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const REFUSED_LANES = new Set([
  'FAMILY',
  'LANE_B',
  'CCRLT',
  'CCRLT_HOR',
  'HOUSE',
  'HOUSE_OF_RANSOM',
  'LIVING_TRUST',
  'PERSONAL',
  'HOPE_PRIMERICA',
  'LICENSED_PRACTICE',
]);

export function assertMinistryLane(lane: unknown) {
  if (lane === undefined || lane === null || lane === '') return;
  if (typeof lane !== 'string') throw new DeskError(400, 'lane must be a string');
  const normalized = lane.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === LANE) return;
  if (REFUSED_LANES.has(normalized) || normalized.includes('RANSOM') || normalized.includes('TRUST')) {
    throw new DeskError(
      403,
      'This desk keeps NTE ministry records only. House of Ransom, the Living Trust, and private family records are not stored here.',
    );
  }
  throw new DeskError(403, `This desk accepts lane ${LANE} only.`);
}

export function canonical(value: unknown): string {
  if (value === undefined || value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`)
    .join(',')}}`;
}

export function eventHash(prev: string, body: unknown) {
  return createHash('sha256').update(`${prev}\n${canonical(body)}`).digest('hex');
}

export function payloadHash(body: unknown) {
  return createHash('sha256').update(canonical(body)).digest('hex');
}

export function requireText(value: unknown, field: string, max = 160) {
  if (typeof value !== 'string' || !value.trim()) throw new DeskError(400, `${field} is required`);
  const text = value.trim();
  if (text.length > max) throw new DeskError(400, `${field} is too long`);
  return text;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new DeskError(400, `${field} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

export function normalizeEmail(value: unknown) {
  const email = requireText(value, 'email', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new DeskError(400, 'email is not a valid address');
  return email;
}

export function normalizePhone(value: unknown) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new DeskError(400, 'phone must be a string');
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length < 7 || digits.length > 15) throw new DeskError(400, 'phone must have 7 to 15 digits');
  return digits;
}

export function validateLead(input: {
  name: unknown;
  email: unknown;
  phone?: unknown;
  consent: unknown;
  consentText: unknown;
}) {
  if (input.consent !== true) {
    throw new DeskError(400, 'consent must be true. This desk does not store a lead without an explicit consent flag.');
  }
  return {
    name: requireText(input.name, 'name', 120),
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    consentText: requireText(input.consentText, 'consentText', 500),
  };
}

/** Statuses a person may type on this desk. VERIFIED and SYSTEM_RECORDED are not self-assigned. */
export const DESK_EVIDENCE = ['USER_REPORTED', 'DOCUMENT_STATED', 'INFERRED', 'UNKNOWN'] as const;

export function validateEvidence(value: unknown): EvidenceRef[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new DeskError(400, 'evidence must be a list');
  return value.map((item, index) => {
    if (!item || typeof item !== 'object') throw new DeskError(400, `evidence[${index}] must be an object`);
    const row = item as Record<string, unknown>;
    const status = oneOf(row.status, EVIDENCE, `evidence[${index}].status`);
    if (!(DESK_EVIDENCE as readonly string[]).includes(status)) {
      throw new DeskError(
        400,
        `evidence[${index}].status cannot be ${status}. This desk records ${DESK_EVIDENCE.join(', ')}.`,
      );
    }
    const source = requireText(row.source, `evidence[${index}].source`, 200);
    const asOf = requireText(row.asOf, `evidence[${index}].asOf`, 40);
    if (Number.isNaN(Date.parse(asOf))) throw new DeskError(400, `evidence[${index}].asOf is not a readable date`);
    const note = row.note === undefined || row.note === null || row.note === '' ? undefined : requireText(row.note, `evidence[${index}].note`, 300);
    return note ? { status, source, asOf, note } : { status, source, asOf };
  });
}

export interface DraftHandoff {
  audience: string;
  channel: string;
  draft: string;
  status: 'draft';
  sent: false;
}

/** A handoff is a draft packet. It does not send, publish, or schedule delivery. */
export function validateHandoff(value: unknown): DraftHandoff {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DeskError(400, 'handoff must include audience, channel, and draft');
  }
  const row = value as Record<string, unknown>;
  return {
    audience: requireText(row.audience, 'handoff.audience', 120),
    channel: requireText(row.channel, 'handoff.channel', 80),
    draft: requireText(row.draft, 'handoff.draft', 2000),
    status: 'draft',
    sent: false,
  };
}

/**
 * Adapter boundary for a provider this process does not call.
 * verified and error stay unreachable until a probe sets contacted to true.
 */
export function adapterBoundary(provider: Provider) {
  return {
    provider,
    transport: 'none' as const,
    credentialsAccepted: false,
    mountsOutbound: false,
    summary: `Closed boundary for ${provider}. A local label can be saved. This process does not call the provider, store a credential, or treat a check as verified or failed.`,
  };
}

export function nextStage(stage: PipelineStage): PipelineStage | null {
  const index = PIPELINE_STAGES.indexOf(stage);
  return PIPELINE_STAGES[index + 1] ?? null;
}

export function releasePayload(item: { id: string; name: string; artifactNote: string; qaNote: string }) {
  return { id: item.id, name: item.name, stage: 'release_review', artifactNote: item.artifactNote, qaNote: item.qaNote };
}

/**
 * Moving into content or marketing handoff is a draft handoff, not a publish.
 * It still requires a human approval whose hash matches the artifact as it stands.
 */
export function assertAdvance(from: PipelineStage, to: PipelineStage, approvedHash: string | null, currentHash: string) {
  const expected = nextStage(from);
  if (!expected || to !== expected) {
    throw new DeskError(409, `Cannot move from ${from} to ${to}. The next stage is ${expected ?? 'none'}.`);
  }
  if (from === 'release_review' || from === 'content_handoff') {
    if (!approvedHash) throw new DeskError(403, 'A human approval is required before this handoff.');
    if (approvedHash !== currentHash) {
      throw new DeskError(409, 'The artifact changed after approval. Approve the current text before moving on.');
    }
  }
}

export interface Probe {
  contacted: boolean;
  ok: boolean | null;
  detail: string;
}

/** A check that did not contact the provider must not become verified or error. */
export function applyIntegrationCheck(current: IntegrationState, probe: Probe): { state: IntegrationState; detail: string } {
  if (!probe.contacted) {
    return {
      state: current,
      detail: probe.detail || 'No outbound check was run. State was not set to verified.',
    };
  }
  if (probe.ok === true) return { state: 'verified', detail: probe.detail };
  if (probe.ok === false) return { state: 'error', detail: probe.detail };
  return { state: current, detail: probe.detail };
}

const SECRET_KEYS = new Set(['secret', 'apikey', 'api_key', 'token', 'password', 'credential', 'credentials', 'access_token']);

export function rejectSecrets(body: unknown) {
  if (!body || typeof body !== 'object') return;
  for (const key of Object.keys(body as Record<string, unknown>)) {
    if (SECRET_KEYS.has(key.toLowerCase())) {
      throw new DeskError(400, 'This desk does not accept secrets or API credentials.');
    }
  }
}

export function introducesCycle(taskId: string, dependsOn: string[], edges: Map<string, string[]>) {
  const graph = new Map(edges);
  graph.set(taskId, dependsOn);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function walk(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const next of graph.get(id) ?? []) {
      if (walk(next)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  return walk(taskId);
}

export function verifyChain(events: { prevHash: string; hash: string; body: unknown }[]) {
  let prev = 'GENESIS';
  for (const event of events) {
    if (event.prevHash !== prev) return false;
    if (event.hash !== eventHash(prev, event.body)) return false;
    prev = event.hash;
  }
  return true;
}

export function localCheckProbe(): Probe {
  return {
    contacted: false,
    ok: null,
    detail: 'No outbound adapter is configured. The provider was not contacted, and the state was not set to verified.',
  };
}
