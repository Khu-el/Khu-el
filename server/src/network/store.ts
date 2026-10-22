import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '../lib/db.js';
import { newId, nowIso } from '../lib/id.js';
import type { AuthTokenPayload } from '../lib/auth.js';
import { canWrite } from '../lib/roles.js';
import { appendCheckpoint } from './checkpoint.js';
import { planRegistry } from './registry.js';
import {
  AUTHORITY,
  FORMATION_NOTE,
  FORMATION_STATUS,
  LANE,
  PROVIDERS,
  DeskError,
  entityFromQuery,
  refuseFormationClaim,
  resolveEntity,
  applyIntegrationCheck,
  assertAdvance,
  adapterBoundary,
  assertMinistryLane,
  validateHandoff,
  eventHash,
  introducesCycle,
  localCheckProbe,
  oneOf,
  payloadHash,
  rejectSecrets,
  releasePayload,
  requireText,
  validateEvidence,
  validateLead,
  verifyChain,
  type Brand,
  type DeskEntity,
  type IntegrationState,
  type PipelineStage,
  type Provider,
  type RegulatedDomain,
} from './logic.js';

interface UserRef {
  sub: string;
  role: AuthTokenPayload['role'];
}

function writer(user: UserRef) {
  if (!canWrite(user.role)) throw new DeskError(403, 'Your role is read-only');
}

function owns(user: UserRef) {
  return user.role === 'SYSTEM_ADMIN' ? null : user.sub;
}

const checkpointOwners = new Set<string>();

function withWrite<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    const owners = [...checkpointOwners];
    checkpointOwners.clear();
    for (const ownerId of owners) appendCheckpoint(ownerId);
    return result;
  } catch (err) {
    checkpointOwners.clear();
    try {
      db.exec('ROLLBACK');
    } catch {
      // The transaction may already be closed.
    }
    throw err;
  }
}

function appendEvent(
  ownerId: string,
  actorId: string,
  event: string,
  entityType: string,
  entityId: string,
  detail: unknown,
  orgEntity: DeskEntity = 'NETWORK',
) {
  const prev = db.prepare(
    'SELECT hash FROM network_events WHERE owner_id = ? ORDER BY seq DESC LIMIT 1',
  ).get(ownerId) as { hash: string } | undefined;
  const prevHash = prev?.hash ?? 'GENESIS';
  const base = detail && typeof detail === 'object' && !Array.isArray(detail) ? { ...(detail as Record<string, unknown>) } : { value: detail };
  const stored = { ...base, orgEntity, formationStatus: FORMATION_STATUS };
  const body = { event, entityType, entityId, detail: stored };
  const hash = eventHash(prevHash, body);
  db.prepare(
    `INSERT INTO network_events (ts, owner_id, actor_id, event, entity_type, entity_id, org_entity, detail, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nowIso(), ownerId, actorId, event, entityType, entityId, orgEntity, JSON.stringify(stored), prevHash, hash);
  checkpointOwners.add(ownerId);
  return { prevHash, hash, ...body, ts: nowIso() };
}

function chosenEntity(body: Record<string, unknown>): DeskEntity {
  refuseFormationClaim(body);
  return resolveEntity(body.entityId);
}

function formationFields(row: Record<string, unknown>) {
  return {
    entityId: String(row.entity_id ?? 'NETWORK'),
    formationStatus: FORMATION_STATUS,
    formationNote: FORMATION_NOTE,
  };
}

export { entityFromQuery };

function mapProject(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    lane: String(row.lane),
    title: String(row.title),
    status: String(row.status),
    sample: Boolean(row.sample),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...formationFields(row),
  };
}

function mapTask(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    ownerId: String(row.owner_id),
    assignee: row.assignee,
    title: row.title,
    status: row.status,
    dependsOn: JSON.parse(String(row.depends_on)),
    evidence: JSON.parse(String(row.evidence_json)),
    lane: row.lane,
    sample: Boolean(row.sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...formationFields(row),
  };
}

export function health(user: UserRef) {
  ensureIntegrations(user.sub);
  const events = listEvents({ sub: user.sub, role: 'NTE_VIRTUAL_OPERATOR' });
  const integrations = listIntegrations({ sub: user.sub, role: 'NTE_VIRTUAL_OPERATOR' });
  return {
    ok: true,
    prototype: true,
    outboundAdapters: false,
    ledger: 'append-only',
    ledgerIntact: verifyChain(
      events.map((event) => ({
        prevHash: event.prevHash,
        hash: event.hash,
        body: { event: event.event, entityType: event.entityType, entityId: event.entityId, detail: event.detail },
      })),
    ),
    authority: AUTHORITY,
    integrations: integrations.map((row) => ({
      provider: row.provider,
      state: row.state,
      checked: false,
    })),
    counts: {
      projects: count('network_projects', user.sub, user.sub),
      leads: count('network_leads', user.sub, user.sub),
      events: events.length,
    },
  };
}

function count(table: string, ownerId: string, scope: string | null) {
  if (scope) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE owner_id = ? AND lane = ?`).get(ownerId, LANE) as { n: number };
    return row.n;
  }
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE lane = ?`).get(LANE) as { n: number };
  return row.n;
}

export function listProjects(user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND entity_id = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM network_projects WHERE owner_id = ? AND lane = ?${entitySql} ORDER BY updated_at DESC`).all(
        ...(entity ? [scope, LANE, entity] : [scope, LANE]),
      )
    : db.prepare(`SELECT * FROM network_projects WHERE lane = ?${entitySql} ORDER BY updated_at DESC`).all(
        ...(entity ? [LANE, entity] : [LANE]),
      );
  return (rows as Record<string, unknown>[]).map(mapProject);
}

export function createProject(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const title = requireText(body.title, 'title');
  const status = body.status === undefined ? 'draft' : oneOf(body.status, ['draft', 'active', 'blocked', 'done'] as const, 'status');
  const entityId = chosenEntity(body);
  const id = newId('prj');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_projects (id, owner_id, lane, title, status, entity_id, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, title, status, entityId, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'project.created', 'project', id, { title, status, sample }, entityId);
  });
  return listProjects(user).find((row) => row.id === id);
}

export function updateProject(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const status = oneOf(body.status, ['draft', 'active', 'blocked', 'done'] as const, 'status');
  const existing = projectForWrite(user, id);
  if (body.entityId !== undefined && body.entityId !== existing.entity_id) {
    throw new DeskError(400, 'entityId cannot be changed');
  }
  refuseFormationClaim(body);
  withWrite(() => {
    db.prepare('UPDATE network_projects SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), existing.id);
    appendEvent(user.sub, user.sub, 'project.updated', 'project', existing.id, { status }, resolveEntity(existing.entity_id));
  });
  return listProjects(user).find((row) => row.id === id);
}

function projectForWrite(user: UserRef, id: string) {
  const row = db.prepare('SELECT * FROM network_projects WHERE id = ? AND lane = ?').get(id, LANE) as
    | { id: string; owner_id: string; entity_id: string }
    | undefined;
  if (!row || (row.owner_id !== user.sub && user.role !== 'SYSTEM_ADMIN')) throw new DeskError(404, 'Project not found');
  if (row.owner_id !== user.sub) throw new DeskError(403, 'Projects are private to the account that created them');
  return row;
}

export function listTasks(user: UserRef, projectId: string) {
  projectVisible(user, projectId);
  const rows = db.prepare('SELECT * FROM network_tasks WHERE project_id = ? AND owner_id = ? AND lane = ? ORDER BY created_at').all(
    projectId,
    ownerOfProject(projectId),
    LANE,
  ) as Record<string, unknown>[];
  if (owns(user) && ownerOfProject(projectId) !== user.sub) return [];
  return rows.map(mapTask);
}

function ownerOfProject(projectId: string) {
  const row = db.prepare('SELECT owner_id FROM network_projects WHERE id = ?').get(projectId) as { owner_id: string } | undefined;
  return row?.owner_id ?? '';
}

function projectVisible(user: UserRef, projectId: string) {
  const row = db.prepare('SELECT owner_id FROM network_projects WHERE id = ? AND lane = ?').get(projectId, LANE) as
    | { owner_id: string }
    | undefined;
  if (!row) throw new DeskError(404, 'Project not found');
  if (row.owner_id !== user.sub && user.role !== 'SYSTEM_ADMIN') throw new DeskError(404, 'Project not found');
  return row;
}

export function createTask(user: UserRef, projectId: string, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const project = projectForWrite(user, projectId);
  if (body.entityId !== undefined && body.entityId !== project.entity_id) {
    throw new DeskError(400, 'A task uses the entity of its project');
  }
  refuseFormationClaim(body);
  const title = requireText(body.title, 'title');
  const assignee = requireText(body.assignee ?? 'unassigned', 'assignee', 80);
  const status = body.status === undefined ? 'queued' : oneOf(body.status, ['queued', 'in_progress', 'blocked', 'done'] as const, 'status');
  const dependsOn = stringList(body.dependsOn, 'dependsOn');
  const evidence = validateEvidence(body.evidence);
  const siblings = db.prepare('SELECT id, depends_on FROM network_tasks WHERE project_id = ?').all(project.id) as {
    id: string;
    depends_on: string;
  }[];
  const known = new Set(siblings.map((row) => row.id));
  for (const dep of dependsOn) {
    if (!known.has(dep)) throw new DeskError(400, 'dependsOn must name tasks in the same project');
  }
  const edges = new Map(siblings.map((row) => [row.id, JSON.parse(row.depends_on) as string[]]));
  const id = newId('task');
  if (introducesCycle(id, dependsOn, edges)) throw new DeskError(409, 'That dependency would create a cycle');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_tasks
        (id, project_id, owner_id, assignee, title, status, depends_on, evidence_json, lane, entity_id, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, project.id, user.sub, assignee, title, status, JSON.stringify(dependsOn), JSON.stringify(evidence), LANE, project.entity_id, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'task.created', 'task', id, { projectId, title, status, dependsOn, sample }, resolveEntity(project.entity_id));
  });
  return listTasks(user, project.id).find((row) => row.id === id);
}

export function updateTask(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const row = db.prepare('SELECT * FROM network_tasks WHERE id = ? AND lane = ?').get(id, LANE) as
    | { id: string; owner_id: string; project_id: string; depends_on: string; assignee: string; evidence_json: string; entity_id: string }
    | undefined;
  if (!row || row.owner_id !== user.sub) throw new DeskError(404, 'Task not found');
  const assignee = body.assignee === undefined ? row.assignee : requireText(body.assignee, 'assignee', 80);
  const evidence = body.evidence === undefined ? row.evidence_json : JSON.stringify(validateEvidence(body.evidence));
  const status = body.status === undefined
    ? (db.prepare('SELECT status FROM network_tasks WHERE id = ?').get(id) as { status: 'queued' | 'in_progress' | 'blocked' | 'done' }).status
    : oneOf(body.status, ['queued', 'in_progress', 'blocked', 'done'] as const, 'status');
  let dependsOn = JSON.parse(row.depends_on) as string[];
  if (body.dependsOn !== undefined) {
    dependsOn = stringList(body.dependsOn, 'dependsOn');
    const siblings = db.prepare('SELECT id, depends_on FROM network_tasks WHERE project_id = ?').all(row.project_id) as {
      id: string;
      depends_on: string;
    }[];
    const known = new Set(siblings.map((item) => item.id));
    for (const dep of dependsOn) {
      if (!known.has(dep)) throw new DeskError(400, 'dependsOn must name tasks in the same project');
    }
    const edges = new Map(siblings.map((item) => [item.id, JSON.parse(item.depends_on) as string[]]));
    if (introducesCycle(id, dependsOn, edges)) throw new DeskError(409, 'That dependency would create a cycle');
  }
  if (status === 'done') {
    const deps = dependsOn;
    for (const dep of deps) {
      const prior = db.prepare('SELECT status FROM network_tasks WHERE id = ? AND owner_id = ?').get(dep, user.sub) as
        | { status: string }
        | undefined;
      if (!prior || prior.status !== 'done') throw new DeskError(409, 'A dependency is not done');
    }
  }
  withWrite(() => {
    db.prepare(
      'UPDATE network_tasks SET status = ?, assignee = ?, depends_on = ?, evidence_json = ?, updated_at = ? WHERE id = ?',
    ).run(status, assignee, JSON.stringify(dependsOn), evidence, nowIso(), id);
    appendEvent(user.sub, user.sub, 'task.updated', 'task', id, { status, assignee, dependsOn }, resolveEntity(row.entity_id));
  });
  return listTasks(user, row.project_id).find((task) => task.id === id);
}

function stringList(value: unknown, field: string) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new DeskError(400, `${field} must be a list of ids`);
  }
  return value as string[];
}

export function listPipeline(user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND entity_id = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM network_pipeline WHERE owner_id = ? AND lane = ?${entitySql} ORDER BY updated_at DESC`).all(
        ...(entity ? [scope, LANE, entity] : [scope, LANE]),
      )
    : db.prepare(`SELECT * FROM network_pipeline WHERE lane = ?${entitySql} ORDER BY updated_at DESC`).all(
        ...(entity ? [LANE, entity] : [LANE]),
      );
  return (rows as Record<string, unknown>[]).map(mapPipeline);
}

function parseJson(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return JSON.parse(String(value));
}

function mapPipeline(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    lane: String(row.lane),
    name: String(row.name),
    stage: row.stage as PipelineStage,
    artifactNote: row.artifact_note,
    qaNote: row.qa_note,
    approvedHash: row.approved_hash,
    contentHandoff: parseJson(row.content_handoff),
    marketingHandoff: parseJson(row.marketing_handoff),
    sample: Boolean(row.sample),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...formationFields(row),
  };
}

export function createPipeline(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const name = requireText(body.name, 'name');
  const entityId = chosenEntity(body);
  const id = newId('pipe');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_pipeline
        (id, owner_id, lane, name, stage, artifact_note, qa_note, approved_hash, entity_id, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'brief', '', '', NULL, ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, name, entityId, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'pipeline.created', 'pipeline', id, { name, stage: 'brief', sample }, entityId);
  });
  return listPipeline(user).find((row) => row.id === id);
}

function pipelineForWrite(user: UserRef, id: string) {
  const row = db.prepare('SELECT * FROM network_pipeline WHERE id = ? AND lane = ?').get(id, LANE) as
    | {
        id: string;
        owner_id: string;
        name: string;
        stage: PipelineStage;
        artifact_note: string;
        qa_note: string;
        approved_hash: string | null;
        content_handoff: string | null;
        marketing_handoff: string | null;
        sample: number;
        entity_id: string;
      }
    | undefined;
  if (!row || row.owner_id !== user.sub) throw new DeskError(404, 'Pipeline item not found');
  return row;
}

export function advancePipeline(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const row = pipelineForWrite(user, id);
  const to = oneOf(body.toStage, ['brief', 'artifact', 'qa', 'release_review', 'content_handoff', 'marketing_handoff'] as const, 'toStage');
  const current = payloadHash(releasePayload({ id: row.id, name: row.name, artifactNote: row.artifact_note, qaNote: row.qa_note }));
  assertAdvance(row.stage, to, row.approved_hash, current);
  let artifactNote = row.artifact_note;
  let qaNote = row.qa_note;
  let contentHandoff = row.content_handoff;
  let marketingHandoff = row.marketing_handoff;
  if (to === 'artifact') artifactNote = requireText(body.note ?? body.artifactNote, 'note', 2000);
  if (to === 'qa') qaNote = requireText(body.note ?? body.qaNote, 'note', 2000);
  if (to === 'content_handoff') contentHandoff = JSON.stringify(validateHandoff(body.handoff));
  if (to === 'marketing_handoff') marketingHandoff = JSON.stringify(validateHandoff(body.handoff));
  const approvedHash = to === 'release_review' ? null : row.approved_hash;
  withWrite(() => {
    db.prepare(
      `UPDATE network_pipeline
       SET stage = ?, artifact_note = ?, qa_note = ?, approved_hash = ?, content_handoff = ?, marketing_handoff = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      to,
      artifactNote,
      qaNote,
      to === 'artifact' || to === 'qa' ? null : approvedHash,
      contentHandoff,
      marketingHandoff,
      nowIso(),
      id,
    );
    appendEvent(user.sub, user.sub, 'pipeline.advanced', 'pipeline', id, {
      from: row.stage,
      to,
      published: false,
      sent: false,
    }, resolveEntity(row.entity_id));
  });
  return listPipeline(user).find((item) => item.id === id);
}

export function proposeRelease(user: UserRef, id: string) {
  writer(user);
  const row = pipelineForWrite(user, id);
  if (row.stage !== 'release_review') throw new DeskError(409, 'Release approval is only proposed from release review');
  const hash = payloadHash(releasePayload({ id: row.id, name: row.name, artifactNote: row.artifact_note, qaNote: row.qa_note }));
  const approvalId = newId('apr');
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_approvals (id, owner_id, pipeline_id, payload_hash, status, proposed_by, approved_by, created_at)
       VALUES (?, ?, ?, ?, 'proposed', ?, NULL, ?)`,
    ).run(approvalId, user.sub, id, hash, user.sub, nowIso());
    appendEvent(user.sub, user.sub, 'release.proposed', 'pipeline', id, { approvalId, payloadHash: hash, class: 'CONSEQUENTIAL' }, resolveEntity(row.entity_id));
  });
  return { approvalId, payloadHash: hash, status: 'proposed' as const, executes: false };
}

const SAMPLE_APPROVER_EMAIL = 'sample.approver@example.test';
const SAMPLE_APPROVER_LABEL = 'SAMPLE · Approver (prototype)';

/** A local account with no known password. It exists so a demo can show a second actor. */
export function ensureSampleApprover() {
  const existing = db.prepare('SELECT id, display_name FROM users WHERE email = ?').get(SAMPLE_APPROVER_EMAIL) as
    | { id: string; display_name: string }
    | undefined;
  if (existing) return { id: existing.id, label: existing.display_name, email: SAMPLE_APPROVER_EMAIL, sample: true as const };
  const id = newId('user');
  const passwordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 10);
  db.prepare(
    'INSERT INTO users (id, email, password_hash, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, SAMPLE_APPROVER_EMAIL, passwordHash, SAMPLE_APPROVER_LABEL, 'FAMILY_COUNCIL_MEMBER', nowIso());
  return { id, label: SAMPLE_APPROVER_LABEL, email: SAMPLE_APPROVER_EMAIL, sample: true as const };
}

function finishApproval(
  row: { id: string; owner_id: string; name: string; artifact_note: string; qa_note: string; entity_id?: string },
  approval: { id: string; payload_hash: string; proposed_by: string },
  approverId: string,
  sampleActor: boolean,
) {
  if (approval.proposed_by === approverId) {
    throw new DeskError(403, 'The proposer cannot approve their own release.');
  }
  const current = payloadHash(releasePayload({ id: row.id, name: row.name, artifactNote: row.artifact_note, qaNote: row.qa_note }));
  if (approval.payload_hash !== current) {
    throw new DeskError(409, 'Approval hash does not match the artifact. Propose again.');
  }
  withWrite(() => {
    db.prepare(`UPDATE network_approvals SET status = 'approved', approved_by = ? WHERE id = ?`).run(approverId, approval.id);
    db.prepare('UPDATE network_pipeline SET approved_hash = ?, updated_at = ? WHERE id = ?').run(current, nowIso(), row.id);
    appendEvent(row.owner_id, approverId, 'release.approved', 'pipeline', row.id, {
      approvalId: approval.id,
      payloadHash: current,
      approvedBy: approverId,
      sampleActor,
      published: false,
      note: 'Approval records a human gate. It does not publish, send, or deploy.',
    }, resolveEntity(row.entity_id));
  });
  return {
    approvalId: approval.id,
    status: 'approved' as const,
    published: false,
    payloadHash: current,
    approvedBy: approverId,
    sampleActor,
  };
}

function proposedApproval(id: string, approvalId: string, submitted: string) {
  const approval = db.prepare('SELECT * FROM network_approvals WHERE id = ? AND pipeline_id = ?').get(approvalId, id) as
    | { id: string; payload_hash: string; status: string; proposed_by: string }
    | undefined;
  if (!approval || approval.status !== 'proposed') throw new DeskError(404, 'Proposed approval not found');
  if (submitted !== approval.payload_hash) throw new DeskError(409, 'Approval hash does not match the artifact. Propose again.');
  return approval;
}

export function approveRelease(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  const row = db.prepare('SELECT * FROM network_pipeline WHERE id = ? AND lane = ?').get(id, LANE) as
    | { id: string; owner_id: string; name: string; artifact_note: string; qa_note: string }
    | undefined;
  if (!row) throw new DeskError(404, 'Pipeline item not found');
  const approval = proposedApproval(id, requireText(body.approvalId, 'approvalId', 80), requireText(body.payloadHash, 'payloadHash', 80));
  if (approval.proposed_by === user.sub) throw new DeskError(403, 'The proposer cannot approve their own release.');
  return finishApproval(row, approval, user.sub, false);
}

/** Records the labeled sample account as approver. It refuses anything that is not a sample item. */
export function approveAsSampleActor(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  const row = pipelineForWrite(user, id);
  if (!row.sample) throw new DeskError(403, 'The sample approver only acts on labeled sample pipeline items.');
  const actor = ensureSampleApprover();
  const approval = proposedApproval(id, requireText(body.approvalId, 'approvalId', 80), requireText(body.payloadHash, 'payloadHash', 80));
  if (approval.proposed_by !== user.sub) throw new DeskError(403, 'Only the proposer can hand a sample item to the sample approver.');
  const result = finishApproval(row, approval, actor.id, true);
  return { ...result, approverLabel: actor.label };
}

export function listLeads(user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND entity_id = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM network_leads WHERE owner_id = ? AND lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [scope, LANE, entity] : [scope, LANE]),
      )
    : db.prepare(`SELECT * FROM network_leads WHERE lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [LANE, entity] : [LANE]),
      );
  return (rows as Record<string, unknown>[]).map(mapLead);
}

function mapLead(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    lane: String(row.lane),
    name: String(row.name),
    email: String(row.email),
    phone: row.phone,
    consent: Boolean(row.consent),
    consentText: row.consent_text,
    consentAt: row.consent_at,
    sample: Boolean(row.sample),
    createdAt: row.created_at,
    ...formationFields(row),
  };
}

export function createLead(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const entityId = chosenEntity(body);
  const lead = validateLead({
    name: body.name,
    email: body.email,
    phone: body.phone,
    consent: body.consent,
    consentText: body.consentText,
  });
  const existing = db.prepare(
    `SELECT id FROM network_leads
     WHERE owner_id = ? AND (email = ? OR (? != '' AND phone = ?))`,
  ).get(user.sub, lead.email, lead.phone, lead.phone) as { id: string } | undefined;
  if (existing) {
    throw new DeskError(409, `A lead with that email or phone is already on file (${existing.id}). It was not merged or overwritten.`);
  }
  const id = newId('lead');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_leads
        (id, owner_id, lane, name, email, phone, consent, consent_text, consent_at, entity_id, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, lead.name, lead.email, lead.phone, lead.consentText, now, entityId, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'lead.created', 'lead', id, { email: lead.email, consent: true, sample, sent: false }, entityId);
  });
  return listLeads(user).find((row) => row.id === id);
}

export function listAssets(user: UserRef, entity?: DeskEntity) {
  return listBrand('network_assets', user, entity);
}

export function createAsset(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const entityId = chosenEntity(body);
  const brand = oneOf(body.brand, ['TED', 'NVS'] as const, 'brand') satisfies Brand;
  const name = requireText(body.name, 'name');
  const kind = oneOf(body.kind, ['logo', 'copy', 'color', 'other'] as const, 'kind');
  const note = body.note === undefined ? '' : requireText(body.note, 'note', 500);
  const id = newId('asset');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_assets (id, owner_id, lane, brand, name, kind, status, note, entity_id, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, brand, name, kind, note, entityId, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'asset.created', 'asset', id, { brand, name, kind, status: 'draft', sample }, entityId);
  });
  return listAssets(user).find((row) => row.id === id);
}

export function listCampaigns(user: UserRef, entity?: DeskEntity) {
  return listBrand('network_campaigns', user, entity);
}

function listBrand(table: 'network_assets' | 'network_campaigns', user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND entity_id = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM ${table} WHERE owner_id = ? AND lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [scope, LANE, entity] : [scope, LANE]),
      )
    : db.prepare(`SELECT * FROM ${table} WHERE lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [LANE, entity] : [LANE]),
      );
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    ownerId: String(row.owner_id),
    lane: String(row.lane),
    brand: String(row.brand),
    name: row.name === undefined ? undefined : String(row.name),
    title: row.title === undefined ? undefined : String(row.title),
    kind: row.kind === undefined ? undefined : String(row.kind),
    status: String(row.status),
    note: row.note === undefined ? '' : String(row.note),
    sample: Boolean(row.sample),
    createdAt: String(row.created_at),
    scheduledOn: row.scheduled_on === undefined ? undefined : String(row.scheduled_on),
    ...formationFields(row),
  }));
}

export function createCampaign(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  if (body.status !== undefined && body.status !== 'draft') {
    throw new DeskError(403, 'Campaigns stay drafts. This desk does not publish or schedule a send.');
  }
  const entityId = chosenEntity(body);
  const brand = oneOf(body.brand, ['TED', 'NVS'] as const, 'brand');
  const title = requireText(body.title, 'title');
  const scheduledOn = requireText(body.scheduledOn, 'scheduledOn', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledOn) || Number.isNaN(Date.parse(scheduledOn))) {
    throw new DeskError(400, 'scheduledOn must be a YYYY-MM-DD date');
  }
  const id = newId('camp');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_campaigns (id, owner_id, lane, brand, title, scheduled_on, status, entity_id, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    ).run(id, user.sub, LANE, brand, title, scheduledOn, entityId, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'campaign.drafted', 'campaign', id, { brand, title, scheduledOn, status: 'draft', sent: false, sample }, entityId);
  });
  return listCampaigns(user).find((row) => row.id === id);
}

function ensureIntegrations(ownerId: string) {
  const now = nowIso();
  for (const provider of PROVIDERS) {
    db.prepare(
      `INSERT OR IGNORE INTO network_integrations (id, owner_id, provider, state, detail, updated_at)
       VALUES (?, ?, ?, 'unconfigured', ?, ?)`,
    ).run(newId('int'), ownerId, provider, 'No credentials stored. Provider has not been contacted.', now);
  }
}

export function listIntegrations(user: UserRef) {
  ensureIntegrations(user.sub);
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_integrations WHERE owner_id = ? ORDER BY provider').all(scope)
    : db.prepare('SELECT * FROM network_integrations ORDER BY provider').all();
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    provider: row.provider as Provider,
    state: row.state as IntegrationState,
    detail: row.detail,
    adapter: adapterBoundary(row.provider as Provider),
    updatedAt: row.updated_at,
  }));
}

export function configureIntegration(user: UserRef, provider: string, body: Record<string, unknown>) {
  writer(user);
  rejectSecrets(body);
  const name = oneOf(provider, PROVIDERS, 'provider');
  const label = requireText(body.label, 'label', 80);
  ensureIntegrations(user.sub);
  const detail = `Local label "${label}" saved. No credentials stored. ${name} was not contacted.`;
  withWrite(() => {
    db.prepare(
      `UPDATE network_integrations SET state = 'configured', detail = ?, updated_at = ? WHERE owner_id = ? AND provider = ? AND state != 'verified'`,
    ).run(detail, nowIso(), user.sub, name);
    appendEvent(user.sub, user.sub, 'integration.configured', 'integration', name, { provider: name, state: 'configured', contacted: false });
  });
  return listIntegrations(user).find((row) => row.provider === name);
}

export function checkIntegration(user: UserRef, provider: string) {
  writer(user);
  const name = oneOf(provider, PROVIDERS, 'provider');
  ensureIntegrations(user.sub);
  const current = listIntegrations(user).find((row) => row.provider === name);
  if (!current || current.ownerId !== user.sub) throw new DeskError(404, 'Integration not found');
  const next = applyIntegrationCheck(current.state, localCheckProbe());
  withWrite(() => {
    db.prepare('UPDATE network_integrations SET state = ?, detail = ?, updated_at = ? WHERE owner_id = ? AND provider = ?').run(
      next.state,
      next.detail,
      nowIso(),
      user.sub,
      name,
    );
    appendEvent(user.sub, user.sub, 'integration.checked', 'integration', name, {
      provider: name,
      state: next.state,
      contacted: false,
    });
  });
  return { ...listIntegrations(user).find((row) => row.provider === name), contacted: false };
}

export function listQueues(user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND entity_id = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM network_queues WHERE owner_id = ? AND lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [scope, LANE, entity] : [scope, LANE]),
      )
    : db.prepare(`SELECT * FROM network_queues WHERE lane = ?${entitySql} ORDER BY created_at DESC`).all(
        ...(entity ? [LANE, entity] : [LANE]),
      );
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    lane: row.lane,
    domain: row.domain,
    title: row.title,
    status: row.status,
    sample: Boolean(row.sample),
    createdAt: row.created_at,
    ...formationFields(row),
  }));
}

export function createQueue(user: UserRef, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const domain = oneOf(body.domain, ['finance', 'insurance', 'legal', 'debt'] as const, 'domain') satisfies RegulatedDomain;
  const entityId = chosenEntity(body);
  const title = requireText(body.title, 'title');
  const id = newId('queue');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_queues (id, owner_id, lane, domain, title, status, entity_id, sample, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, 0, ?)`,
    ).run(id, user.sub, LANE, domain, title, entityId, now);
    appendEvent(user.sub, user.sub, 'queue.drafted', 'queue', id, { domain, title, status: 'draft', acted: false }, entityId);
  });
  return listQueues(user).find((row) => row.id === id);
}

export function actOnQueue() {
  throw new DeskError(
    403,
    'Finance, insurance, legal, and debt items stay in the draft queue. This desk does not file, collect, advise, or send.',
  );
}

export function listEvents(user: UserRef, entity?: DeskEntity) {
  const scope = owns(user);
  const entitySql = entity ? ' AND org_entity = ?' : '';
  const rows = scope
    ? db.prepare(`SELECT * FROM network_events WHERE owner_id = ?${entitySql} ORDER BY seq ASC`).all(...(entity ? [scope, entity] : [scope]))
    : db.prepare(`SELECT * FROM network_events WHERE 1 = 1${entitySql} ORDER BY seq ASC`).all(...(entity ? [entity] : []));
  return (rows as Record<string, unknown>[]).map((row) => {
    const detail = JSON.parse(String(row.detail)) as { orgEntity?: string };
    return {
      seq: row.seq,
      ts: row.ts,
      ownerId: row.owner_id,
      actorId: row.actor_id,
      event: String(row.event),
      entityType: String(row.entity_type),
      entityId: String(row.entity_id),
      orgEntity: String(row.org_entity ?? detail.orgEntity ?? 'NETWORK'),
      formationStatus: FORMATION_STATUS,
      formationNote: FORMATION_NOTE,
      detail,
      prevHash: String(row.prev_hash),
      hash: String(row.hash),
    };
  });
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function rollups(user: UserRef) {
  const ownerIds = user.role === 'SYSTEM_ADMIN'
    ? (db.prepare('SELECT DISTINCT owner_id AS id FROM network_projects WHERE lane = ?').all(LANE) as { id: string }[]).map((row) => row.id)
    : [user.sub];
  return ownerIds.map((ownerId) => {
    const projects = db.prepare('SELECT * FROM network_projects WHERE owner_id = ? AND lane = ?').all(ownerId, LANE) as {
      id: string;
      title: string;
      status: string;
      sample: number;
    }[];
    const tasks = db.prepare('SELECT * FROM network_tasks WHERE owner_id = ? AND lane = ? ORDER BY created_at').all(ownerId, LANE) as {
      id: string;
      title: string;
      status: string;
      depends_on: string;
      evidence_json: string;
      sample: number;
    }[];
    const byId = new Map(tasks.map((task) => [task.id, task]));
    const evidenceCounts: Record<string, number> = { none: 0 };
    const atRiskTasks: { id: string; title: string; reasons: string[]; sample: boolean }[] = [];
    const blockedTasks = tasks.filter((task) => task.status === 'blocked').map((task) => ({
      id: task.id,
      title: task.title,
      sample: Boolean(task.sample),
    }));
    for (const task of tasks) {
      const evidence = JSON.parse(task.evidence_json) as { status: string }[];
      const dependsOn = JSON.parse(task.depends_on) as string[];
      const reasons: string[] = [];
      if (dependsOn.some((dep) => byId.get(dep)?.status !== 'done')) reasons.push('dependency open');
      if (evidence.length === 0) {
        reasons.push('no evidence');
        evidenceCounts.none += 1;
      }
      for (const item of evidence) evidenceCounts[item.status] = (evidenceCounts[item.status] ?? 0) + 1;
      if (evidence.some((item) => item.status === 'UNKNOWN')) reasons.push('evidence UNKNOWN');
      if (reasons.length > 0) atRiskTasks.push({ id: task.id, title: task.title, reasons, sample: Boolean(task.sample) });
    }
    return {
      ownerId,
      projectCount: projects.length,
      taskCount: tasks.length,
      blockedProjects: projects.filter((project) => project.status === 'blocked').map((project) => ({
        id: project.id,
        title: project.title,
        sample: Boolean(project.sample),
      })),
      blockedTasks,
      atRiskTasks,
      evidenceCounts,
    };
  });
}

export function exportDesk(user: UserRef, format: 'json' | 'csv') {
  const scope = owns(user);
  const taskRows = (scope
    ? db.prepare('SELECT * FROM network_tasks WHERE owner_id = ? AND lane = ? ORDER BY created_at').all(scope, LANE)
    : db.prepare('SELECT * FROM network_tasks WHERE lane = ? ORDER BY created_at').all(LANE)) as Record<string, unknown>[];
  const projects = listProjects(user);
  const tasks = taskRows.map(mapTask);
  const leads = listLeads(user);
  const events = listEvents(user);
  if (format === 'json') {
    return { prototype: true, projects, tasks, leads, events };
  }
  const header = ['recordType', 'id', 'ownerId', 'title', 'status', 'detail', 'sample'];
  const lines = [header.join(',')];
  const push = (recordType: string, id: string, ownerId: string, title: string, status: string, detail: string, sample: boolean) => {
    lines.push([recordType, id, ownerId, title, status, detail, sample ? 'true' : 'false'].map(csvCell).join(','));
  };
  for (const project of projects) push('project', project.id, project.ownerId, project.title, project.status, project.lane, project.sample);
  for (const task of tasks) {
    const evidence = task.evidence as { status: string }[];
    push(
      'task',
      task.id,
      String(task.ownerId),
      String(task.title),
      String(task.status),
      `deps:${task.dependsOn.length}; evidence:${evidence.map((item) => item.status).join('|') || 'none'}`,
      task.sample,
    );
  }
  for (const lead of leads) {
    push('lead', lead.id, String(lead.ownerId), String(lead.name), lead.consent ? 'consent' : 'no-consent', String(lead.email), lead.sample);
  }
  for (const event of events) {
    push('ledger', String(event.seq), String(event.ownerId), String(event.event), 'recorded', String(event.hash), false);
  }
  return `${lines.join('\n')}\n`;
}

export function loadSamples(user: UserRef) {
  writer(user);
  const marker = 'SAMPLE · Network command center (prototype)';
  const existing = db.prepare('SELECT id FROM network_projects WHERE owner_id = ? AND title = ?').get(user.sub, marker) as
    | { id: string }
    | undefined;
  if (existing) {
    return { created: false, projectId: existing.id };
  }
  const project = createProject(user, { title: marker, status: 'active' }, true);
  const evidenceTask = createTask(
    user,
    project!.id,
    {
      title: 'SAMPLE · Confirm evidence on the ministry brief (prototype)',
      assignee: 'Sample operator',
      evidence: [{ status: 'UNKNOWN', source: 'prototype seed', asOf: '2026-10-22', note: 'Not a real observation' }],
    },
    true,
  );
  createTask(
    user,
    project!.id,
    {
      title: 'SAMPLE · Follow-on task waiting on evidence (prototype)',
      assignee: 'Sample operator',
      dependsOn: [evidenceTask!.id],
      evidence: [],
    },
    true,
  );
  createPipeline(user, { name: 'SAMPLE · Digital product (prototype)' }, true);
  createLead(
    user,
    {
      name: 'Sample Lead (prototype)',
      email: 'sample.lead@example.test',
      phone: '5550100',
      consent: true,
      consentText: 'SAMPLE prototype consent. This is not a real person and no message is sent.',
    },
    true,
  );
  createAsset(user, { brand: 'NVS', name: 'SAMPLE · NVS wordmark (prototype)', kind: 'logo', note: 'Placeholder. Not a real file.' }, true);
  createAsset(user, { brand: 'TED', name: 'SAMPLE · TED color note (prototype)', kind: 'color', note: 'Placeholder swatch description.' }, true);
  createCampaign(
    user,
    { brand: 'NVS', title: 'SAMPLE · Draft campaign week (prototype)', scheduledOn: '2026-11-02' },
    true,
  );
  return { created: true, projectId: project!.id };
}

export function importRegistry(user: UserRef, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const entityId = chosenEntity(body);
  if (body.dryRun !== undefined && typeof body.dryRun !== 'boolean') throw new DeskError(400, 'dryRun must be true or false');
  const dryRun = body.dryRun !== false;
  const plan = planRegistry(body);
  const preview = {
    dryRun,
    written: false as boolean,
    entityId,
    formationStatus: FORMATION_STATUS,
    formationNote: FORMATION_NOTE,
    kind: plan.kind,
    format: plan.format,
    projects: plan.projects.length,
    tasks: plan.tasks.length,
    rows: plan.rows,
  };
  if (dryRun) return preview;

  const createdProjects: { id: string }[] = [];
  for (const project of plan.projects) {
    const row = createProject(user, { title: project.title, status: project.status, entityId });
    createdProjects.push({ id: row!.id });
  }
  const createdTasks: { id: string }[] = [];
  for (const task of plan.tasks) {
    const project = createdProjects[task.projectIndex];
    const row = createTask(user, project.id, {
      title: task.title,
      assignee: task.assignee,
      status: task.status,
      evidence: task.evidence,
      entityId,
    });
    createdTasks.push({ id: row!.id });
  }
  withWrite(() => {
    appendEvent(user.sub, user.sub, 'registry.imported', 'registry', entityId, {
      kind: plan.kind,
      projects: createdProjects.length,
      tasks: createdTasks.length,
      sample: false,
    }, entityId);
  });
  return {
    ...preview,
    dryRun: false,
    written: true,
    projectIds: createdProjects.map((row) => row.id),
    taskIds: createdTasks.map((row) => row.id),
  };
}
