import { DESK_EVIDENCE, DeskError, type EvidenceRef } from './logic.js';

const SYSTEM_COLUMNS = ['system', 'area', 'state', 'source_of_truth', 'evidence', 'next_action'] as const;
const ACTION_COLUMNS = ['rank', 'action', 'owner', 'gate', 'why', 'status'] as const;
const PROJECT_STATUSES = ['draft', 'active', 'blocked', 'done'] as const;
const TASK_STATUSES = ['queued', 'in_progress', 'blocked', 'done'] as const;

export interface RegistryProjectPlan {
  title: string;
  status: string;
  detail: Record<string, string>;
}

export interface RegistryTaskPlan {
  projectIndex: number;
  title: string;
  assignee: string;
  status: string;
  evidence: EvidenceRef[];
  detail: Record<string, string>;
}

export interface RegistryPlan {
  kind: 'systems' | 'actions';
  format: 'json' | 'csv';
  projects: RegistryProjectPlan[];
  tasks: RegistryTaskPlan[];
  rows: Record<string, string>[];
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DeskError(400, `${label} must be an object`);
  return value as Record<string, unknown>;
}

function cell(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') throw new DeskError(400, 'Registry cells must be text');
  return String(value).trim();
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let quoted = false;
  const src = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          current += '"';
          i += 1;
        } else quoted = false;
      } else current += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === ',') {
      row.push(current.trim());
      current = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(current.trim());
      if (row.some((part) => part !== '')) rows.push(row);
      row = [];
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((part) => part !== '')) rows.push(row);
  }
  return rows;
}

function rowsFromBody(body: Record<string, unknown>, columns: readonly string[]): Record<string, string>[] {
  const format = body.format;
  if (format !== 'json' && format !== 'csv') throw new DeskError(400, 'format must be json or csv');
  if (typeof body.text !== 'string' || !body.text.trim()) throw new DeskError(400, 'text is required');

  let raw: Record<string, unknown>[];
  if (format === 'csv') {
    const table = parseCsv(body.text);
    if (table.length < 2) throw new DeskError(400, 'CSV needs a header and one row');
    const header = table[0].map((name) => name.trim());
    for (const column of columns) {
      if (!header.includes(column)) throw new DeskError(400, `Missing column ${column}`);
    }
    raw = table.slice(1).map((cells) => {
      const record: Record<string, unknown> = {};
      header.forEach((name, index) => {
        record[name] = cells[index] ?? '';
      });
      return record;
    });
  } else {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.text);
    } catch {
      throw new DeskError(400, 'text is not valid JSON');
    }
    const list = Array.isArray(parsed)
      ? parsed
      : asRecord(parsed, 'JSON registry')[body.kind === 'actions' ? 'actions' : 'systems'] ?? asRecord(parsed, 'JSON registry').rows;
    if (!Array.isArray(list)) throw new DeskError(400, 'JSON registry must be an array or an object with rows');
    raw = list.map((row, index) => asRecord(row, `row ${index + 1}`));
    for (const row of raw) {
      for (const column of columns) {
        if (!(column in row)) throw new DeskError(400, `Missing column ${column}`);
      }
    }
  }

  return raw.map((row) => {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) out[key] = cell(value);
    for (const column of columns) {
      if (!(column in out)) throw new DeskError(400, `Missing column ${column}`);
    }
    return out;
  });
}

function bounded(value: string, field: string, max: number) {
  const text = value.trim();
  if (!text) throw new DeskError(400, `${field} is required`);
  if (text.length > max) throw new DeskError(400, `${field} is too long`);
  return text;
}

function evidenceFromCell(value: string, asOf: string): EvidenceRef[] {
  if (!value) return [];
  if (value === 'VERIFIED' || value === 'SYSTEM_RECORDED') {
    throw new DeskError(400, 'Registry evidence cannot be VERIFIED or SYSTEM_RECORDED');
  }
  const status = (DESK_EVIDENCE as readonly string[]).includes(value) ? value : 'DOCUMENT_STATED';
  const source = status === value ? 'registry import' : value;
  if (source.length > 200) throw new DeskError(400, 'evidence is too long');
  return [{ status: status as EvidenceRef['status'], source, asOf, note: 'Imported from a registry file. Not externally verified.' }];
}

export function planRegistry(body: Record<string, unknown>, asOf = new Date().toISOString().slice(0, 10)): RegistryPlan {
  const kind = body.kind;
  if (kind !== 'systems' && kind !== 'actions') throw new DeskError(400, 'kind must be systems or actions');
  const format = body.format === 'json' || body.format === 'csv' ? body.format : 'json';
  if (kind === 'systems') {
    const rows = rowsFromBody(body, SYSTEM_COLUMNS);
    const projects: RegistryProjectPlan[] = [];
    const tasks: RegistryTaskPlan[] = [];
    for (const row of rows) {
      const title = bounded(row.system, 'system', 160);
      if (row.next_action.length > 160) throw new DeskError(400, 'next_action is too long');
      const status = (PROJECT_STATUSES as readonly string[]).includes(row.state) ? row.state : 'draft';
      projects.push({
        title,
        status,
        detail: { area: row.area, state: row.state, source_of_truth: row.source_of_truth, evidence: row.evidence },
      });
      if (row.next_action) {
        tasks.push({
          projectIndex: projects.length - 1,
          title: row.next_action.trim(),
          assignee: 'unassigned',
          status: 'queued',
          evidence: evidenceFromCell(row.evidence, asOf),
          detail: { area: row.area, source_of_truth: row.source_of_truth },
        });
      }
    }
    return { kind, format, projects, tasks, rows };
  }

  const rows = rowsFromBody(body, ACTION_COLUMNS);
  const projectTitle = 'Registry actions';
  const tasks: RegistryTaskPlan[] = rows.map((row) => {
    const title = bounded(row.action, 'action', 160);
    const assignee = row.owner.trim() || 'unassigned';
    if (assignee.length > 80) throw new DeskError(400, 'owner is too long');
    const status = (TASK_STATUSES as readonly string[]).includes(row.status) ? row.status : 'queued';
    return {
      projectIndex: 0,
      title,
      assignee,
      status,
      evidence: [],
      detail: { rank: row.rank, gate: row.gate, why: row.why, status: row.status },
    };
  });
  return {
    kind,
    format,
    projects: rows.length ? [{ title: projectTitle, status: 'draft', detail: { source: 'registry actions' } }] : [],
    tasks,
    rows,
  };
}
