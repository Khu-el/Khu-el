import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiError,
  AuthGate,
  Button,
  Card,
  Field,
  NoAutonomousExecutionBanner,
  NotLegalOrFinancialAdviceFooter,
  ROLE_LABELS,
  TextInput,
  api,
  getApiBaseUrl,
  getToken,
} from '@nte/governance-core';

const TABS = [
  ['home', 'Home'],
  ['command', 'Command'],
  ['pipeline', 'Pipeline'],
  ['leads', 'Leads'],
  ['brand', 'Brand'],
  ['integrations', 'Integrations'],
  ['ledger', 'Ledger'],
] as const;

type Tab = (typeof TABS)[number][0];

interface RepoApp { name: string | null; version: string | null; path: string; status: string; runtimeChecked: boolean; description?: string | null }
interface RepoStatus {
  probed: boolean;
  note: string;
  nvsAgentDesk: RepoApp & { mountedOnThisServer: boolean };
  apps: RepoApp[];
}

interface Health {
  prototype: boolean;
  outboundAdapters: boolean;
  ledger: string;
  ledgerIntact: boolean;
  authority: {
    lane: string;
    trustee: string;
    representative: string;
    nte: string;
    assertionStatus: string;
    legalStatusVerified: boolean;
    excluded: string[];
  };
  integrations: { provider: string; state: string }[];
  counts: { projects: number; leads: number; events: number };
}

const DESK_ENTITIES = ['VEI', 'OPS', 'NPE', 'MFG', 'GHC', 'TFS', 'IPI', 'QVI', 'NETWORK'] as const;

interface Project { id: string; title: string; status: string; sample: boolean; entityId: string; formationStatus: string }
interface Evidence { status: string; source: string; asOf?: string; note?: string }
interface Task { id: string; title: string; status: string; assignee: string; dependsOn: string[]; evidence: Evidence[]; sample: boolean }
interface Handoff { audience: string; channel: string; draft: string; status: string; sent: boolean }
interface Pipe {
  id: string;
  name: string;
  stage: string;
  artifactNote: string;
  qaNote: string;
  approvedHash: string | null;
  contentHandoff: Handoff | null;
  marketingHandoff: Handoff | null;
  sample: boolean;
}
interface Lead { id: string; name: string; email: string; phone: string; consent: boolean; sample: boolean; entityId: string; formationStatus: string }
interface Asset { id: string; brand: string; name: string; kind: string; status: string; sample: boolean; entityId: string; formationStatus: string }
interface Campaign { id: string; brand: string; title: string; scheduledOn?: string; scheduled_on?: string; status: string; sample: boolean }
interface Integration {
  provider: string;
  state: string;
  detail: string;
  contacted?: boolean;
  adapter?: { transport: string; mountsOutbound: boolean; credentialsAccepted: boolean; summary: string };
}
interface Queue { id: string; domain: string; title: string; status: string }
interface DeskEvent { seq: number; event: string; entityId: string; orgEntity: string; formationStatus: string; hash: string }
interface RevenueSummary { evidence: string; gross: number | null; refunds: number | null; net: number | null; count: number; draft: boolean }

interface Rollup {
  ownerId: string;
  projectCount: number;
  taskCount: number;
  blockedProjects: { id: string; title: string }[];
  blockedTasks: { id: string; title: string }[];
  atRiskTasks: { id: string; title: string; reasons: string[] }[];
  evidenceCounts: Record<string, number>;
}

function Graph({ tasks }: { tasks: Task[] }) {
  const rowHeight = 56;
  const height = Math.max(tasks.length, 1) * rowHeight + 8;
  return (
    <svg viewBox={`0 0 640 ${height}`} className="w-full bg-white border border-neutral-200 rounded-md" role="img" aria-label="Task dependency graph">
      {tasks.map((task, index) => {
        const y = 8 + index * rowHeight;
        return (
          <g key={task.id}>
            {task.dependsOn.map((dep) => {
              const from = tasks.findIndex((item) => item.id === dep);
              if (from < 0) return null;
              const y1 = 8 + from * rowHeight + 22;
              return <line key={dep} x1={28} y1={y1} x2={28} y2={y + 22} stroke="#737373" strokeWidth={1.5} />;
            })}
            <rect x={48} y={y} width={576} height={40} rx={6} fill="#fafafa" stroke="#d4d4d4" />
            <text x={60} y={y + 25} fontSize={12} fill="#171717">{task.title.slice(0, 72)}</text>
          </g>
        );
      })}
    </svg>
  );
}

async function downloadExport(format: 'json' | 'csv') {
  const token = getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/network/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = format === 'csv' ? 'network-desk.csv' : 'network-desk.json';
  link.click();
  URL.revokeObjectURL(url);
}

function message(err: unknown) {
  return err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Request failed';
}

function EntitySelect({ value, onChange, allowAll = false }: { value: string; onChange: (value: string) => void; allowAll?: boolean }) {
  return (
    <select className="border border-neutral-300 rounded-md px-2 py-1.5 text-sm bg-white" value={value} onChange={(e) => onChange(e.target.value)} aria-label={allowAll ? 'Filter by entity' : 'Entity for new records'}>
      {allowAll && <option value="">All entities</option>}
      {DESK_ENTITIES.map((id) => <option key={id} value={id}>{id}</option>)}
    </select>
  );
}

function Sample({ on }: { on: boolean }) {
  if (!on) return null;
  return <span className="ml-2 text-xs uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Sample</span>;
}

export default function App() {
  return (
    <AuthGate appName="NTE Network Desk">
      {({ user, logout }) => (
        <Desk label={`${user.displayName} · ${ROLE_LABELS[user.role]}`} onLogout={logout} />
      )}
    </AuthGate>
  );
}

function Desk({ label, onLogout }: { label: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('home');
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [repo, setRepo] = useState<RepoStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const projectIdRef = useRef(projectId);
  projectIdRef.current = projectId;
  const [pipeline, setPipeline] = useState<Pipe[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [events, setEvents] = useState<DeskEvent[]>([]);
  const [rollups, setRollups] = useState<Rollup[]>([]);
  const [evidenceFilter, setEvidenceFilter] = useState('all');
  const [title, setTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [assignee, setAssignee] = useState('Desk operator');
  const [dependsOn, setDependsOn] = useState('');
  const [evidence, setEvidence] = useState({ status: 'UNKNOWN', source: '', asOf: '2026-10-22' });
  const [proposal, setProposal] = useState<{ id: string; approvalId: string; payloadHash: string } | null>(null);
  const [handoff, setHandoff] = useState({ audience: '', channel: '', draft: '' });
  const [pipeName, setPipeName] = useState('');
  const [note, setNote] = useState('');
  const [lead, setLead] = useState({ name: '', email: '', phone: '', consent: false, consentText: '' });
  const [asset, setAsset] = useState({ brand: 'NVS', name: '', kind: 'copy' });
  const [campaign, setCampaign] = useState({ brand: 'TED', title: '', scheduledOn: '' });
  const [queueTitle, setQueueTitle] = useState('');
  const [domain, setDomain] = useState('legal');
  const [entityFilter, setEntityFilter] = useState('');
  const [entityId, setEntityId] = useState<(typeof DESK_ENTITIES)[number]>('NETWORK');
  const [registryText, setRegistryText] = useState('system,area,state,source_of_truth,evidence,next_action\nSAMPLE registry,ministry,draft,local file,DOCUMENT_STATED,Review the row');
  const [registryKind, setRegistryKind] = useState<'systems' | 'actions'>('systems');
  const [registryFormat, setRegistryFormat] = useState<'csv' | 'json'>('csv');
  const [registryPreview, setRegistryPreview] = useState<string>('');
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [revenueForm, setRevenueForm] = useState({ period: '', product: '', gross: '', refunds: '', net: '', evidenceLink: '' });

  const entityQuery = entityFilter ? `?entity=${encodeURIComponent(entityFilter)}` : '';

  const refresh = useCallback(async (next: Tab, selected?: string) => {
    setError(null);
    try {
      if (next === 'home') {
        setHealth(await api.get<Health>('/api/network/health'));
        setRepo(await api.get<RepoStatus>('/api/network/repository-status'));
        setRevenue(await api.get<RevenueSummary>(`/api/network/revenue/summary${entityQuery}`));
      }
      if (next === 'command') {
        const body = await api.get<{ projects: Project[] }>(`/api/network/projects${entityQuery}`);
        setProjects(body.projects);
        const id = selected ?? (projectIdRef.current || body.projects[0]?.id || '');
        if (id !== projectIdRef.current) setProjectId(id);
        if (id) {
          const taskBody = await api.get<{ tasks: Task[] }>(`/api/network/projects/${id}/tasks`);
          setTasks(taskBody.tasks);
        } else setTasks([]);
        setRollups((await api.get<{ rollups: Rollup[] }>('/api/network/rollups')).rollups);
      }
      if (next === 'pipeline') setPipeline((await api.get<{ items: Pipe[] }>('/api/network/pipeline')).items);
      if (next === 'leads') setLeads((await api.get<{ leads: Lead[] }>(`/api/network/leads${entityQuery}`)).leads);
      if (next === 'brand') {
        setAssets((await api.get<{ assets: Asset[] }>(`/api/network/assets${entityQuery}`)).assets);
        setCampaigns((await api.get<{ campaigns: Campaign[] }>('/api/network/campaigns')).campaigns);
      }
      if (next === 'integrations') {
        setIntegrations((await api.get<{ integrations: Integration[] }>('/api/network/integrations')).integrations);
        setQueues((await api.get<{ queues: Queue[] }>('/api/network/queues')).queues);
      }
      if (next === 'ledger') setEvents((await api.get<{ events: DeskEvent[] }>(`/api/network/events${entityQuery}`)).events);
    } catch (err) {
      setError(message(err));
    }
  }, [entityQuery]);

  useEffect(() => {
    void refresh(tab);
  }, [tab, refresh]);

  async function act(fn: () => Promise<void>, stay: Tab = tab) {
    setError(null);
    try {
      await fn();
      await refresh(stay);
    } catch (err) {
      setError(message(err));
    }
  }

  const visibleTasks = tasks.filter((task) => evidenceFilter === 'all' || (evidenceFilter === 'none' ? task.evidence.length === 0 : task.evidence.some((item) => item.status === evidenceFilter)));

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Prototype · NTE ministry lane</p>
            <h1 className="text-xl font-semibold text-neutral-900">NTE Network Desk</h1>
            <p className="text-sm text-neutral-500">{label}. The account role is assigned by the server. Records on this desk stay in lane NTE_MINISTRY and on this account.</p>
          </div>
          <Button variant="secondary" onClick={onLogout}>Sign out</Button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 flex gap-2 pb-3 overflow-x-auto" aria-label="Desk sections">
          {TABS.map(([id, name]) => (
            <button
              key={id}
              className={`text-sm px-3 py-1.5 rounded-md ${tab === id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-100'}`}
              onClick={() => setTab(id)}
            >
              {name}
            </button>
          ))}
        </nav>
        <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-wrap items-center gap-3 text-sm text-neutral-600">
          <label className="flex items-center gap-2">Show <EntitySelect allowAll value={entityFilter} onChange={setEntityFilter} /></label>
          <label className="flex items-center gap-2">New records <EntitySelect value={entityId} onChange={(value) => setEntityId(value as typeof entityId)} /></label>
          <span>Formation: unformed. Legal existence is not recorded.</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">Outbound adapters are off. Sample rows are fictional. Records outside the ministry lane are not stored here.</p>
        </NoAutonomousExecutionBanner>
        {error && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>}

        {tab === 'home' && health && (
          <Card title="Declared capacity" subtitle="Internal model. This software does not verify legal status.">
            <dl className="text-sm grid gap-1">
              <div>Lane: {health.authority.lane}</div>
              <div>Trustee for NTE affairs: {health.authority.trustee}</div>
              <div>Minister / authorized representative: {health.authority.representative}</div>
              <div>NTE: {health.authority.nte}</div>
              <div>Assertion: {health.authority.assertionStatus}. Legally verified here: {health.authority.legalStatusVerified ? 'yes' : 'no'}.</div>
              <div>Excluded: {health.authority.excluded.join(', ')}.</div>
              <div>Ledger: {health.ledger}. Intact for this account: {health.ledgerIntact ? 'yes' : 'no'}. Outbound adapters: {health.outboundAdapters ? 'on' : 'off'}.</div>
              <div>Your records: {health.counts.projects} projects, {health.counts.leads} leads, {health.counts.events} events.</div>
            </dl>
            <div className="mt-4">
              <Button onClick={() => act(async () => { await api.post('/api/network/samples', {}); }, 'home')}>Load labeled sample records</Button>
            </div>
            <p className="text-xs text-neutral-500 mt-3">The eight-branch shell (Home, Command, GodMode, Sales, Invest, Mind, Deploy, Brand) is not in this repository. This desk does not invent it. Command, pipeline, leads, brand, integrations, and the ledger are the sections that exist.</p>
          </Card>
        )}
        {tab === 'home' && revenue && (
          <Card title="Revenue ledger" subtitle="Draft only. A figure is stored only with an evidence link. Nothing here is an estimate or a send.">
            <p className="text-sm">{revenue.evidence === 'no evidence recorded' ? 'no evidence recorded' : `Recorded draft net ${revenue.net} from ${revenue.count} evidenced rows.`}</p>
            <form className="mt-3 grid gap-2 md:grid-cols-2" onSubmit={(e) => {
              e.preventDefault();
              const amount = (value: string) => value.trim() === '' ? null : Number(value);
              void act(async () => {
                await api.post('/api/network/revenue', {
                  period: revenueForm.period,
                  product: revenueForm.product,
                  gross: amount(revenueForm.gross),
                  refunds: amount(revenueForm.refunds),
                  net: amount(revenueForm.net),
                  evidenceLink: revenueForm.evidenceLink,
                  entityId,
                });
                setRevenueForm({ period: '', product: '', gross: '', refunds: '', net: '', evidenceLink: '' });
              }, 'home');
            }}>
              <Field label="Period"><TextInput placeholder="YYYY-MM" value={revenueForm.period} onChange={(e) => setRevenueForm({ ...revenueForm, period: e.target.value })} required /></Field>
              <Field label="Product"><TextInput value={revenueForm.product} onChange={(e) => setRevenueForm({ ...revenueForm, product: e.target.value })} required /></Field>
              <Field label="Gross"><TextInput value={revenueForm.gross} onChange={(e) => setRevenueForm({ ...revenueForm, gross: e.target.value })} required /></Field>
              <Field label="Refunds"><TextInput value={revenueForm.refunds} onChange={(e) => setRevenueForm({ ...revenueForm, refunds: e.target.value })} required /></Field>
              <Field label="Net"><TextInput value={revenueForm.net} onChange={(e) => setRevenueForm({ ...revenueForm, net: e.target.value })} required /></Field>
              <Field label="Evidence link"><TextInput value={revenueForm.evidenceLink} onChange={(e) => setRevenueForm({ ...revenueForm, evidenceLink: e.target.value })} required /></Field>
              <Button type="submit">Record draft</Button>
            </form>
          </Card>
        )}
        {tab === 'home' && repo && (
          <Card title="Repository status" subtitle="Read from package.json. Runtime was not checked.">
            <p className="text-sm text-neutral-600">{repo.note}</p>
            <p className="text-sm mt-2">{repo.nvsAgentDesk.name} {repo.nvsAgentDesk.version} · {repo.nvsAgentDesk.status} · mounted on this API: {repo.nvsAgentDesk.mountedOnThisServer ? 'yes' : 'no'} · runtime checked: {repo.nvsAgentDesk.runtimeChecked ? 'yes' : 'no'}</p>
            {repo.nvsAgentDesk.description && <p className="text-xs text-neutral-500">{repo.nvsAgentDesk.description}</p>}
            <ul className="mt-3 text-sm space-y-1">
              {repo.apps.map((app) => (
                <li key={app.path}>{app.name} {app.version} · {app.path} · {app.status} · runtime checked: {app.runtimeChecked ? 'yes' : 'no'}</li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'command' && (
          <div className="space-y-4">
            <Card title="Owner rollup" subtitle="Blocked means that status. At risk means an open dependency, missing evidence, or UNKNOWN evidence. This is not a score.">
              {rollups.map((row) => (
                <div key={row.ownerId} className="text-sm">
                  <div>{row.projectCount} projects · {row.taskCount} tasks · {row.blockedProjects.length} blocked projects · {row.blockedTasks.length} blocked tasks · {row.atRiskTasks.length} at risk</div>
                  <ul className="mt-2 space-y-1">
                    {row.atRiskTasks.map((task) => <li key={task.id}>{task.title}: {task.reasons.join(', ')}</li>)}
                  </ul>
                </div>
              ))}
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => act(async () => { await downloadExport('json'); })}>Export JSON</Button>
                <Button variant="secondary" onClick={() => act(async () => { await downloadExport('csv'); })}>Export CSV</Button>
              </div>
            </Card>
            <Graph tasks={visibleTasks} />
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Projects" subtitle="Owner, status, and lane are stored on the server.">
              <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/projects', { title, entityId }); setTitle(''); }); }}>
                <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
                <Button type="submit">Add project</Button>
              </form>
              <ul className="mt-4 space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button className={`text-left w-full text-sm border rounded-md px-3 py-2 ${project.id === projectId ? 'border-neutral-900' : 'border-neutral-200'}`} onClick={() => { setProjectId(project.id); void refresh('command', project.id); }}>
                      {project.title}<Sample on={project.sample} />
                      <span className="block text-xs text-neutral-500">Owner: this account · {project.status} · {project.entityId} · {project.formationStatus}</span>
                    </button>
                    {project.id === projectId && (
                      <label className="block text-xs text-neutral-500 mt-1">
                        Status
                        <select className="mt-1 w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={project.status} onChange={(e) => { const status = e.target.value; void act(async () => { await api.patch(`/api/network/projects/${project.id}`, { status }); }); }}>
                          {['draft', 'active', 'blocked', 'done'].map((status) => <option key={status}>{status}</option>)}
                        </select>
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Tasks" subtitle="Dependencies and evidence stay on the selected project. Verified status is not self-assigned.">
              <Field label="Evidence filter">
                <select className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={evidenceFilter} onChange={(e) => setEvidenceFilter(e.target.value)}>
                  {['all', 'none', 'UNKNOWN', 'USER_REPORTED', 'DOCUMENT_STATED', 'INFERRED'].map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </Field>
              <form onSubmit={(e) => { e.preventDefault(); if (!projectId) return; void act(async () => { await api.post(`/api/network/projects/${projectId}/tasks`, { title: taskTitle, assignee, dependsOn: dependsOn ? [dependsOn] : [], evidence: [] }); setTaskTitle(''); setDependsOn(''); }); }}>
                <Field label="Task"><TextInput value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required /></Field>
                <Field label="Assignee"><TextInput value={assignee} onChange={(e) => setAssignee(e.target.value)} required /></Field>
                <Field label="Depends on">
                  <select className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={dependsOn} onChange={(e) => setDependsOn(e.target.value)}>
                    <option value="">None</option>
                    {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                  </select>
                </Field>
                <Button type="submit" disabled={!projectId}>Add task</Button>
              </form>
              <ul className="mt-4 space-y-2 text-sm">
                {visibleTasks.map((task) => (
                  <li key={task.id} className="border border-neutral-200 rounded-md px-3 py-2">
                    {task.title}<Sample on={task.sample} />
                    <span className="block text-xs text-neutral-500">{task.status} · {task.assignee} · deps {task.dependsOn.length} · evidence {task.evidence.map((item) => item.status).join(', ') || 'none'}</span>
                    {task.status !== 'done' && (
                      <Button className="mt-2" variant="secondary" onClick={() => act(async () => { await api.patch(`/api/network/tasks/${task.id}`, { status: 'done' }); })}>Mark done</Button>
                    )}
                  </li>
                ))}
              </ul>
              <form className="mt-4" onSubmit={(e) => { e.preventDefault(); const task = tasks.find((item) => item.title.includes('Confirm evidence')) ?? tasks[0]; if (!task || !evidence.source.trim()) return; void act(async () => { await api.patch(`/api/network/tasks/${task.id}`, { evidence: [{ ...evidence, note: 'Recorded on the desk. Not externally verified.' }] }); setEvidence({ ...evidence, source: '' }); }); }}>
                <Field label={`Evidence for ${tasks.find((item) => item.title.includes('Confirm evidence'))?.title ?? tasks[0]?.title ?? 'a task'}`}>
                  <select className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={evidence.status} onChange={(e) => setEvidence({ ...evidence, status: e.target.value })}>
                    {['UNKNOWN', 'USER_REPORTED', 'DOCUMENT_STATED', 'INFERRED'].map((status) => <option key={status}>{status}</option>)}
                  </select>
                </Field>
                <Field label="Evidence source"><TextInput value={evidence.source} onChange={(e) => setEvidence({ ...evidence, source: e.target.value })} /></Field>
                <Field label="As of"><TextInput value={evidence.asOf} onChange={(e) => setEvidence({ ...evidence, asOf: e.target.value })} /></Field>
                <Button type="submit" variant="secondary" disabled={!tasks[0]}>Save evidence</Button>
              </form>
            </Card>
          </div>
          <Card title="Registry import" subtitle="Preview writes nothing. Import appends projects, tasks, and ledger events for the selected entity.">
            <div className="grid gap-2 md:grid-cols-2">
              <Field label="Kind">
                <select className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={registryKind} onChange={(e) => { setRegistryKind(e.target.value as 'systems' | 'actions'); setRegistryPreview(''); }}>
                  <option value="systems">systems</option>
                  <option value="actions">actions</option>
                </select>
              </Field>
              <Field label="Format">
                <select className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm" value={registryFormat} onChange={(e) => { setRegistryFormat(e.target.value as 'csv' | 'json'); setRegistryPreview(''); }}>
                  <option value="csv">csv</option>
                  <option value="json">json</option>
                </select>
              </Field>
            </div>
            <Field label="Registry file">
              <textarea className="w-full border border-neutral-300 rounded-md px-2 py-1.5 text-sm font-mono" rows={5} value={registryText} onChange={(e) => { setRegistryText(e.target.value); setRegistryPreview(''); }} />
            </Field>
            <p className="text-xs text-neutral-500 mb-2">Columns for systems: system, area, state, source_of_truth, evidence, next_action. Columns for actions: rank, action, owner, gate, why, status. Entity {entityId} is unformed.</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => act(async () => {
                const preview = await api.post<{ projects: number; tasks: number; formationStatus: string; written: boolean }>('/api/network/registry/import', { format: registryFormat, kind: registryKind, text: registryText, entityId, dryRun: true });
                setRegistryPreview(`${preview.projects} projects, ${preview.tasks} tasks, formation ${preview.formationStatus}, written ${preview.written ? 'yes' : 'no'}`);
              })}>Preview</Button>
              <Button disabled={!registryPreview} onClick={() => act(async () => {
                const imported = await api.post<{ projects: number; tasks: number }>('/api/network/registry/import', { format: registryFormat, kind: registryKind, text: registryText, entityId, dryRun: false });
                setRegistryPreview(`Imported ${imported.projects} projects and ${imported.tasks} tasks.`);
              })}>Import</Button>
            </div>
            {registryPreview && <p className="text-sm mt-2">{registryPreview}</p>}
          </Card>
          </div>
        )}

        {tab === 'pipeline' && (
          <Card title="Product pipeline" subtitle="Brief to artifact, QA, release review, then draft content and marketing handoff. Approval does not publish.">
            <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/pipeline', { name: pipeName }); setPipeName(''); }); }}>
              <Field label="Name"><TextInput value={pipeName} onChange={(e) => setPipeName(e.target.value)} required /></Field>
              <Button type="submit">Open brief</Button>
            </form>
            <Field label="Note for the next artifact or QA step"><TextInput value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <div className="grid gap-2 md:grid-cols-3">
              <Field label="Handoff audience"><TextInput value={handoff.audience} onChange={(e) => setHandoff({ ...handoff, audience: e.target.value })} /></Field>
              <Field label="Handoff channel"><TextInput value={handoff.channel} onChange={(e) => setHandoff({ ...handoff, channel: e.target.value })} /></Field>
              <Field label="Handoff draft"><TextInput value={handoff.draft} onChange={(e) => setHandoff({ ...handoff, draft: e.target.value })} /></Field>
            </div>
            <p className="text-xs text-neutral-500">A handoff stays a draft. The proposer cannot approve their own release. The SAMPLE actor is a different local account and only applies to sample items. Approval does not publish, send, or deploy.</p>
            <ul className="space-y-3">
              {pipeline.map((item) => (
                <li key={item.id} className="border border-neutral-200 rounded-md p-3 text-sm">
                  <div className="font-medium">{item.name}<Sample on={item.sample} /></div>
                  <div className="text-neutral-500">Stage: {item.stage}</div>
                  {item.approvedHash && <div className="text-xs text-neutral-500 break-all">Approved hash: {item.approvedHash}</div>}
                  {item.contentHandoff && <div className="text-xs text-neutral-500">Content draft · sent {item.contentHandoff.sent ? 'yes' : 'no'} · {item.contentHandoff.audience}</div>}
                  {item.marketingHandoff && <div className="text-xs text-neutral-500">Marketing draft · sent {item.marketingHandoff.sent ? 'yes' : 'no'} · {item.marketingHandoff.channel}</div>}
                  {proposal?.id === item.id && <div className="text-xs text-neutral-500 break-all">Proposed hash: {proposal.payloadHash}</div>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.stage === 'brief' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'artifact', note }); })}>Move to artifact</Button>}
                    {item.stage === 'artifact' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'qa', note }); })}>Move to QA</Button>}
                    {item.stage === 'qa' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'release_review' }); })}>Request release review</Button>}
                    {item.stage === 'release_review' && (
                      <Button variant="secondary" onClick={() => act(async () => {
                        const proposed = await api.post<{ approvalId: string; payloadHash: string }>(`/api/network/pipeline/${item.id}/propose-release`, {});
                        setProposal({ id: item.id, approvalId: proposed.approvalId, payloadHash: proposed.payloadHash });
                      })}>Propose release</Button>
                    )}
                    {item.stage === 'release_review' && proposal?.id === item.id && (
                      <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/approve`, proposal); })}>Approve as this account</Button>
                    )}
                    {item.stage === 'release_review' && item.sample && proposal?.id === item.id && (
                      <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/approve-sample`, proposal); })}>Approve as SAMPLE actor</Button>
                    )}
                    {item.stage === 'release_review' && <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'content_handoff', handoff }); })}>Content handoff</Button>}
                    {item.stage === 'content_handoff' && <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'marketing_handoff', handoff }); })}>Marketing handoff</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'leads' && (
          <Card title="NVS lead intake" subtitle="Consent is required. A duplicate email or phone is refused, not merged. Nothing is sent.">
            <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/leads', { ...lead, entityId }); setLead({ name: '', email: '', phone: '', consent: false, consentText: '' }); }); }}>
              <Field label="Name"><TextInput value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} required /></Field>
              <Field label="Email"><TextInput type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} required /></Field>
              <Field label="Phone"><TextInput value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></Field>
              <Field label="Consent text"><TextInput value={lead.consentText} onChange={(e) => setLead({ ...lead, consentText: e.target.value })} required /></Field>
              <label className="block text-sm mb-3"><input type="checkbox" checked={lead.consent} onChange={(e) => setLead({ ...lead, consent: e.target.checked })} /> Consent flag is explicit</label>
              <Button type="submit">Save lead</Button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {leads.map((row) => (
                <li key={row.id} className="border border-neutral-200 rounded-md px-3 py-2">{row.name} · {row.email}{row.phone ? ` · ${row.phone}` : ''} · consent {row.consent ? 'yes' : 'no'} · {row.entityId} · {row.formationStatus}<Sample on={row.sample} /></li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'brand' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="TED / NVS assets" subtitle="Draft registry. No files are uploaded to a publisher.">
              <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/assets', { ...asset, entityId }); setAsset({ ...asset, name: '' }); }); }}>
                <Field label="Brand"><TextInput value={asset.brand} onChange={(e) => setAsset({ ...asset, brand: e.target.value })} /></Field>
                <Field label="Name"><TextInput value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} required /></Field>
                <Button type="submit">Add draft asset</Button>
              </form>
              <ul className="mt-3 text-sm space-y-2">{assets.map((row) => <li key={row.id}>{row.brand} · {row.name} · {row.kind} · {row.status} · {row.entityId} · {row.formationStatus}<Sample on={row.sample} /></li>)}</ul>
            </Card>
            <Card title="Draft campaign calendar" subtitle="Status stays draft. This does not schedule a send.">
              <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/campaigns', campaign); setCampaign({ ...campaign, title: '' }); }); }}>
                <Field label="Brand"><TextInput value={campaign.brand} onChange={(e) => setCampaign({ ...campaign, brand: e.target.value })} /></Field>
                <Field label="Title"><TextInput value={campaign.title} onChange={(e) => setCampaign({ ...campaign, title: e.target.value })} required /></Field>
                <Field label="Date"><TextInput placeholder="YYYY-MM-DD" value={campaign.scheduledOn} onChange={(e) => setCampaign({ ...campaign, scheduledOn: e.target.value })} required /></Field>
                <Button type="submit">Save draft</Button>
              </form>
              <ul className="mt-3 text-sm space-y-2">{campaigns.map((row) => <li key={row.id}>{row.brand} · {row.title} · {row.scheduledOn || row.scheduled_on} · {row.status}<Sample on={row.sample} /></li>)}</ul>
            </Card>
          </div>
        )}

        {tab === 'integrations' && (
          <div className="space-y-4">
            <Card title="Integration registry" subtitle="Unconfigured until a local label is saved. A check does not contact the provider and cannot become verified.">
              <ul className="space-y-3 text-sm">
                {integrations.map((row) => (
                  <li key={row.provider} className="border border-neutral-200 rounded-md p-3">
                    <div className="font-medium">{row.provider} · {row.state}</div>
                    <p className="text-neutral-500">{row.detail}</p>
                    {row.adapter && <p className="text-neutral-500">{row.adapter.summary} Transport: {row.adapter.transport}. Outbound mounted: {row.adapter.mountsOutbound ? 'yes' : 'no'}.</p>}
                    <div className="mt-2 flex gap-2">
                      <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/integrations/${row.provider}/configure`, { label: 'local desk' }); })}>Save local label</Button>
                      <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/integrations/${row.provider}/check`, {}); })}>Run check</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Regulated draft queue" subtitle="Finance, insurance, legal, and debt items have no action. The act control is refused by the server.">
              <form className="flex gap-2 items-end" onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/queues', { domain, title: queueTitle }); setQueueTitle(''); }); }}>
                <Field label="Domain"><TextInput value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
                <Field label="Title"><TextInput value={queueTitle} onChange={(e) => setQueueTitle(e.target.value)} required /></Field>
                <Button type="submit">Queue draft</Button>
              </form>
              <ul className="mt-3 text-sm space-y-2">
                {queues.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-2 border border-neutral-200 rounded-md px-3 py-2">
                    <span>{row.domain} · {row.title} · {row.status}</span>
                    <Button variant="danger" onClick={() => act(async () => { await api.post(`/api/network/queues/${row.id}/act`, {}); })}>Act</Button>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {tab === 'ledger' && (
          <Card title="Append-only event ledger" subtitle="Each row is hashed to the previous row for this account. There is no delete.">
            <ol className="text-sm space-y-2">
              {events.map((event) => (
                <li key={event.seq} className="border border-neutral-200 rounded-md px-3 py-2">
                  <span className="font-medium">{event.event}</span>
                  <span className="block text-xs text-neutral-500 break-all">{event.orgEntity} · {event.formationStatus} · {event.entityId} · {event.hash}</span>
                </li>
              ))}
            </ol>
          </Card>
        )}
        <NotLegalOrFinancialAdviceFooter />
      </main>
    </div>
  );
}
