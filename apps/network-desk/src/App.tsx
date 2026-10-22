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

interface Project { id: string; title: string; status: string; sample: boolean }
interface Task { id: string; title: string; status: string; assignee: string; dependsOn: string[]; evidence: { status: string; source: string }[]; sample: boolean }
interface Pipe { id: string; name: string; stage: string; artifactNote: string; qaNote: string; sample: boolean }
interface Lead { id: string; name: string; email: string; phone: string; consent: boolean; sample: boolean }
interface Asset { id: string; brand: string; name: string; kind: string; status: string; sample: boolean }
interface Campaign { id: string; brand: string; title: string; scheduledOn?: string; scheduled_on?: string; status: string; sample: boolean }
interface Integration { provider: string; state: string; detail: string; contacted?: boolean }
interface Queue { id: string; domain: string; title: string; status: string }
interface DeskEvent { seq: number; event: string; entityId: string; hash: string }

function message(err: unknown) {
  return err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Request failed';
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
  const [title, setTitle] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [pipeName, setPipeName] = useState('');
  const [note, setNote] = useState('');
  const [lead, setLead] = useState({ name: '', email: '', phone: '', consent: false, consentText: '' });
  const [asset, setAsset] = useState({ brand: 'NVS', name: '', kind: 'copy' });
  const [campaign, setCampaign] = useState({ brand: 'TED', title: '', scheduledOn: '' });
  const [queueTitle, setQueueTitle] = useState('');
  const [domain, setDomain] = useState('legal');

  const refresh = useCallback(async (next: Tab, selected?: string) => {
    setError(null);
    try {
      if (next === 'home') setHealth(await api.get<Health>('/api/network/health'));
      if (next === 'command') {
        const body = await api.get<{ projects: Project[] }>('/api/network/projects');
        setProjects(body.projects);
        const id = selected ?? (projectIdRef.current || body.projects[0]?.id || '');
        if (id !== projectIdRef.current) setProjectId(id);
        if (id) {
          const taskBody = await api.get<{ tasks: Task[] }>(`/api/network/projects/${id}/tasks`);
          setTasks(taskBody.tasks);
        } else setTasks([]);
      }
      if (next === 'pipeline') setPipeline((await api.get<{ items: Pipe[] }>('/api/network/pipeline')).items);
      if (next === 'leads') setLeads((await api.get<{ leads: Lead[] }>('/api/network/leads')).leads);
      if (next === 'brand') {
        setAssets((await api.get<{ assets: Asset[] }>('/api/network/assets')).assets);
        setCampaigns((await api.get<{ campaigns: Campaign[] }>('/api/network/campaigns')).campaigns);
      }
      if (next === 'integrations') {
        setIntegrations((await api.get<{ integrations: Integration[] }>('/api/network/integrations')).integrations);
        setQueues((await api.get<{ queues: Queue[] }>('/api/network/queues')).queues);
      }
      if (next === 'ledger') setEvents((await api.get<{ events: DeskEvent[] }>('/api/network/events')).events);
    } catch (err) {
      setError(message(err));
    }
  }, []);

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
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <NoAutonomousExecutionBanner>
          <p className="mt-1">Outbound adapters are off. Sample rows are fictional. House of Ransom, the Living Trust, and private family records are not stored here.</p>
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

        {tab === 'command' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Projects" subtitle="Owner, status, and lane are stored on the server.">
              <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/projects', { title }); setTitle(''); }); }}>
                <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
                <Button type="submit">Add project</Button>
              </form>
              <ul className="mt-4 space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <button className={`text-left w-full text-sm border rounded-md px-3 py-2 ${project.id === projectId ? 'border-neutral-900' : 'border-neutral-200'}`} onClick={() => { setProjectId(project.id); void refresh('command', project.id); }}>
                      {project.title}<Sample on={project.sample} />
                      <span className="block text-xs text-neutral-500">{project.status}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
            <Card title="Tasks" subtitle="Dependencies and evidence stay on the selected project.">
              <form onSubmit={(e) => { e.preventDefault(); if (!projectId) return; void act(async () => { await api.post(`/api/network/projects/${projectId}/tasks`, { title: taskTitle, assignee: 'Desk operator', evidence: [] }); setTaskTitle(''); }); }}>
                <Field label="Task"><TextInput value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required /></Field>
                <Button type="submit" disabled={!projectId}>Add task</Button>
              </form>
              <ul className="mt-4 space-y-2 text-sm">
                {tasks.map((task) => (
                  <li key={task.id} className="border border-neutral-200 rounded-md px-3 py-2">
                    {task.title}<Sample on={task.sample} />
                    <span className="block text-xs text-neutral-500">{task.status} · {task.assignee} · deps {task.dependsOn.length} · evidence {task.evidence.map((item) => item.status).join(', ') || 'none'}</span>
                    {task.status !== 'done' && (
                      <Button className="mt-2" variant="secondary" onClick={() => act(async () => { await api.patch(`/api/network/tasks/${task.id}`, { status: 'done' }); })}>Mark done</Button>
                    )}
                  </li>
                ))}
              </ul>
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
            <ul className="space-y-3">
              {pipeline.map((item) => (
                <li key={item.id} className="border border-neutral-200 rounded-md p-3 text-sm">
                  <div className="font-medium">{item.name}<Sample on={item.sample} /></div>
                  <div className="text-neutral-500">Stage: {item.stage}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.stage === 'brief' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'artifact', note }); })}>Move to artifact</Button>}
                    {item.stage === 'artifact' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'qa', note }); })}>Move to QA</Button>}
                    {item.stage === 'qa' && <Button onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'release_review' }); })}>Request release review</Button>}
                    {item.stage === 'release_review' && (
                      <Button onClick={() => act(async () => {
                        const proposed = await api.post<{ approvalId: string; payloadHash: string }>(`/api/network/pipeline/${item.id}/propose-release`, {});
                        await api.post(`/api/network/pipeline/${item.id}/approve`, proposed);
                      })}>Approve current artifact</Button>
                    )}
                    {item.stage === 'release_review' && <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'content_handoff' }); })}>Content handoff</Button>}
                    {item.stage === 'content_handoff' && <Button variant="secondary" onClick={() => act(async () => { await api.post(`/api/network/pipeline/${item.id}/advance`, { toStage: 'marketing_handoff' }); })}>Marketing handoff</Button>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'leads' && (
          <Card title="NVS lead intake" subtitle="Consent is required. A duplicate email or phone is refused, not merged. Nothing is sent.">
            <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/leads', lead); setLead({ name: '', email: '', phone: '', consent: false, consentText: '' }); }); }}>
              <Field label="Name"><TextInput value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} required /></Field>
              <Field label="Email"><TextInput type="email" value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} required /></Field>
              <Field label="Phone"><TextInput value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} /></Field>
              <Field label="Consent text"><TextInput value={lead.consentText} onChange={(e) => setLead({ ...lead, consentText: e.target.value })} required /></Field>
              <label className="block text-sm mb-3"><input type="checkbox" checked={lead.consent} onChange={(e) => setLead({ ...lead, consent: e.target.checked })} /> Consent flag is explicit</label>
              <Button type="submit">Save lead</Button>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {leads.map((row) => (
                <li key={row.id} className="border border-neutral-200 rounded-md px-3 py-2">{row.name} · {row.email}{row.phone ? ` · ${row.phone}` : ''} · consent {row.consent ? 'yes' : 'no'}<Sample on={row.sample} /></li>
              ))}
            </ul>
          </Card>
        )}

        {tab === 'brand' && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="TED / NVS assets" subtitle="Draft registry. No files are uploaded to a publisher.">
              <form onSubmit={(e) => { e.preventDefault(); void act(async () => { await api.post('/api/network/assets', asset); setAsset({ ...asset, name: '' }); }); }}>
                <Field label="Brand"><TextInput value={asset.brand} onChange={(e) => setAsset({ ...asset, brand: e.target.value })} /></Field>
                <Field label="Name"><TextInput value={asset.name} onChange={(e) => setAsset({ ...asset, name: e.target.value })} required /></Field>
                <Button type="submit">Add draft asset</Button>
              </form>
              <ul className="mt-3 text-sm space-y-2">{assets.map((row) => <li key={row.id}>{row.brand} · {row.name} · {row.kind} · {row.status}<Sample on={row.sample} /></li>)}</ul>
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
                  <span className="block text-xs text-neutral-500 break-all">{event.entityId} · {event.hash}</span>
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
