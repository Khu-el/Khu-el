import { db } from '../lib/db.js';
import { newId, nowIso } from '../lib/id.js';
import type { AuthTokenPayload } from '../lib/auth.js';
import { canWrite } from '../lib/roles.js';
import {
  AUTHORITY,
  LANE,
  PROVIDERS,
  DeskError,
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

function withWrite<T>(fn: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // The transaction may already be closed.
    }
    throw err;
  }
}

function appendEvent(ownerId: string, actorId: string, event: string, entityType: string, entityId: string, detail: unknown) {
  const prev = db.prepare(
    'SELECT hash FROM network_events WHERE owner_id = ? ORDER BY seq DESC LIMIT 1',
  ).get(ownerId) as { hash: string } | undefined;
  const prevHash = prev?.hash ?? 'GENESIS';
  const body = { event, entityType, entityId, detail };
  const hash = eventHash(prevHash, body);
  db.prepare(
    `INSERT INTO network_events (ts, owner_id, actor_id, event, entity_type, entity_id, detail, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(nowIso(), ownerId, actorId, event, entityType, entityId, JSON.stringify(detail), prevHash, hash);
  return { prevHash, hash, ...body, ts: nowIso() };
}

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

export function listProjects(user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_projects WHERE owner_id = ? AND lane = ? ORDER BY updated_at DESC').all(scope, LANE)
    : db.prepare('SELECT * FROM network_projects WHERE lane = ? ORDER BY updated_at DESC').all(LANE);
  return (rows as Record<string, unknown>[]).map(mapProject);
}

export function createProject(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const title = requireText(body.title, 'title');
  const status = body.status === undefined ? 'draft' : oneOf(body.status, ['draft', 'active', 'blocked', 'done'] as const, 'status');
  const id = newId('prj');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_projects (id, owner_id, lane, title, status, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, title, status, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'project.created', 'project', id, { title, status, sample });
  });
  return listProjects(user).find((row) => row.id === id);
}

export function updateProject(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const status = oneOf(body.status, ['draft', 'active', 'blocked', 'done'] as const, 'status');
  const existing = projectForWrite(user, id);
  withWrite(() => {
    db.prepare('UPDATE network_projects SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), existing.id);
    appendEvent(user.sub, user.sub, 'project.updated', 'project', existing.id, { status });
  });
  return listProjects(user).find((row) => row.id === id);
}

function projectForWrite(user: UserRef, id: string) {
  const row = db.prepare('SELECT * FROM network_projects WHERE id = ? AND lane = ?').get(id, LANE) as { id: string; owner_id: string } | undefined;
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
        (id, project_id, owner_id, assignee, title, status, depends_on, evidence_json, lane, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, project.id, user.sub, assignee, title, status, JSON.stringify(dependsOn), JSON.stringify(evidence), LANE, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'task.created', 'task', id, { projectId, title, status, dependsOn, sample });
  });
  return listTasks(user, project.id).find((row) => row.id === id);
}

export function updateTask(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const row = db.prepare('SELECT * FROM network_tasks WHERE id = ? AND lane = ?').get(id, LANE) as
    | { id: string; owner_id: string; project_id: string; depends_on: string; assignee: string; evidence_json: string }
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
    appendEvent(user.sub, user.sub, 'task.updated', 'task', id, { status, assignee, dependsOn });
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

export function listPipeline(user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_pipeline WHERE owner_id = ? AND lane = ? ORDER BY updated_at DESC').all(scope, LANE)
    : db.prepare('SELECT * FROM network_pipeline WHERE lane = ? ORDER BY updated_at DESC').all(LANE);
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
  };
}

export function createPipeline(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const name = requireText(body.name, 'name');
  const id = newId('pipe');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_pipeline
        (id, owner_id, lane, name, stage, artifact_note, qa_note, approved_hash, sample, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'brief', '', '', NULL, ?, ?, ?)`,
    ).run(id, user.sub, LANE, name, sample ? 1 : 0, now, now);
    appendEvent(user.sub, user.sub, 'pipeline.created', 'pipeline', id, { name, stage: 'brief', sample });
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
    });
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
    appendEvent(user.sub, user.sub, 'release.proposed', 'pipeline', id, { approvalId, payloadHash: hash, class: 'CONSEQUENTIAL' });
  });
  return { approvalId, payloadHash: hash, status: 'proposed' as const, executes: false };
}

export function approveRelease(user: UserRef, id: string, body: Record<string, unknown>) {
  writer(user);
  const row = pipelineForWrite(user, id);
  const approvalId = requireText(body.approvalId, 'approvalId', 80);
  const submitted = requireText(body.payloadHash, 'payloadHash', 80);
  const approval = db.prepare('SELECT * FROM network_approvals WHERE id = ? AND owner_id = ? AND pipeline_id = ?').get(
    approvalId,
    user.sub,
    id,
  ) as { id: string; payload_hash: string; status: string } | undefined;
  if (!approval || approval.status !== 'proposed') throw new DeskError(404, 'Proposed approval not found');
  const current = payloadHash(releasePayload({ id: row.id, name: row.name, artifactNote: row.artifact_note, qaNote: row.qa_note }));
  if (submitted !== approval.payload_hash || submitted !== current) {
    throw new DeskError(409, 'Approval hash does not match the artifact. Propose again.');
  }
  withWrite(() => {
    db.prepare(`UPDATE network_approvals SET status = 'approved', approved_by = ? WHERE id = ?`).run(user.sub, approval.id);
    db.prepare('UPDATE network_pipeline SET approved_hash = ?, updated_at = ? WHERE id = ?').run(current, nowIso(), id);
    appendEvent(user.sub, user.sub, 'release.approved', 'pipeline', id, {
      approvalId,
      payloadHash: current,
      published: false,
      note: 'Approval records a human gate. It does not publish, send, or deploy.',
    });
  });
  return { approvalId, status: 'approved' as const, published: false, payloadHash: current };
}

export function listLeads(user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_leads WHERE owner_id = ? AND lane = ? ORDER BY created_at DESC').all(scope, LANE)
    : db.prepare('SELECT * FROM network_leads WHERE lane = ? ORDER BY created_at DESC').all(LANE);
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
  };
}

export function createLead(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
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
        (id, owner_id, lane, name, email, phone, consent, consent_text, consent_at, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`,
    ).run(id, user.sub, LANE, lead.name, lead.email, lead.phone, lead.consentText, now, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'lead.created', 'lead', id, { email: lead.email, consent: true, sample, sent: false });
  });
  return listLeads(user).find((row) => row.id === id);
}

export function listAssets(user: UserRef) {
  return listBrand('network_assets', user);
}

export function createAsset(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  const brand = oneOf(body.brand, ['TED', 'NVS'] as const, 'brand') satisfies Brand;
  const name = requireText(body.name, 'name');
  const kind = oneOf(body.kind, ['logo', 'copy', 'color', 'other'] as const, 'kind');
  const note = body.note === undefined ? '' : requireText(body.note, 'note', 500);
  const id = newId('asset');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_assets (id, owner_id, lane, brand, name, kind, status, note, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    ).run(id, user.sub, LANE, brand, name, kind, note, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'asset.created', 'asset', id, { brand, name, kind, status: 'draft', sample });
  });
  return listAssets(user).find((row) => row.id === id);
}

export function listCampaigns(user: UserRef) {
  return listBrand('network_campaigns', user);
}

function listBrand(table: 'network_assets' | 'network_campaigns', user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare(`SELECT * FROM ${table} WHERE owner_id = ? AND lane = ? ORDER BY created_at DESC`).all(scope, LANE)
    : db.prepare(`SELECT * FROM ${table} WHERE lane = ? ORDER BY created_at DESC`).all(LANE);
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
  }));
}

export function createCampaign(user: UserRef, body: Record<string, unknown>, sample = false) {
  writer(user);
  assertMinistryLane(body.lane);
  if (body.status !== undefined && body.status !== 'draft') {
    throw new DeskError(403, 'Campaigns stay drafts. This desk does not publish or schedule a send.');
  }
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
      `INSERT INTO network_campaigns (id, owner_id, lane, brand, title, scheduled_on, status, sample, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    ).run(id, user.sub, LANE, brand, title, scheduledOn, sample ? 1 : 0, now);
    appendEvent(user.sub, user.sub, 'campaign.drafted', 'campaign', id, { brand, title, scheduledOn, status: 'draft', sent: false, sample });
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

export function listQueues(user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_queues WHERE owner_id = ? AND lane = ? ORDER BY created_at DESC').all(scope, LANE)
    : db.prepare('SELECT * FROM network_queues WHERE lane = ? ORDER BY created_at DESC').all(LANE);
  return (rows as Record<string, unknown>[]).map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    lane: row.lane,
    domain: row.domain,
    title: row.title,
    status: row.status,
    sample: Boolean(row.sample),
    createdAt: row.created_at,
  }));
}

export function createQueue(user: UserRef, body: Record<string, unknown>) {
  writer(user);
  assertMinistryLane(body.lane);
  const domain = oneOf(body.domain, ['finance', 'insurance', 'legal', 'debt'] as const, 'domain') satisfies RegulatedDomain;
  const title = requireText(body.title, 'title');
  const id = newId('queue');
  const now = nowIso();
  withWrite(() => {
    db.prepare(
      `INSERT INTO network_queues (id, owner_id, lane, domain, title, status, sample, created_at)
       VALUES (?, ?, ?, ?, ?, 'draft', 0, ?)`,
    ).run(id, user.sub, LANE, domain, title, now);
    appendEvent(user.sub, user.sub, 'queue.drafted', 'queue', id, { domain, title, status: 'draft', acted: false });
  });
  return listQueues(user).find((row) => row.id === id);
}

export function actOnQueue() {
  throw new DeskError(
    403,
    'Finance, insurance, legal, and debt items stay in the draft queue. This desk does not file, collect, advise, or send.',
  );
}

export function listEvents(user: UserRef) {
  const scope = owns(user);
  const rows = scope
    ? db.prepare('SELECT * FROM network_events WHERE owner_id = ? ORDER BY seq ASC').all(scope)
    : db.prepare('SELECT * FROM network_events ORDER BY seq ASC').all();
  return (rows as Record<string, unknown>[]).map((row) => ({
    seq: row.seq,
    ts: row.ts,
    ownerId: row.owner_id,
    actorId: row.actor_id,
    event: String(row.event),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    detail: JSON.parse(String(row.detail)),
    prevHash: String(row.prev_hash),
    hash: String(row.hash),
  }));
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
