// Staff console: invites (admin/owner), support triage (any staff role) and the
// content studio (editor and above). The tabs mirror the database's role
// checks for convenience only -- every call is still refused by RLS or the
// RPC itself if the role does not allow it. Roles come from the deployment:
// the principal sets them with SQL (private.staff_seed, applied once when the
// account is created; public.staff_members, the live role, after that).
// Nothing here reads or sets one beyond showing the role the database reports.
import { Card, Tabs } from '@nte/governance-core';
import { can, usePortal } from '../context';
import { href } from '../logic/routes';
import { Badge, Notice } from '../components/common';
import type { StaffRole } from '../types';
import { InvitesPanel } from './InvitesPanel';
import { SupportTriage } from './SupportTriage';
import { ContentStudio } from './ContentStudio';

type Section = 'invites' | 'support' | 'content';

const ROLE_LABELS: Record<StaffRole, string> = {
  support: 'Support',
  editor: 'Editor',
  admin: 'Admin',
  owner: 'Owner',
};

const SECTIONS: { id: Section; label: string; allowed: (r: StaffRole | null) => boolean }[] = [
  { id: 'invites', label: 'Invites', allowed: can.manageInvites },
  { id: 'support', label: 'Support', allowed: can.triageSupport },
  { id: 'content', label: 'Content', allowed: can.editContent },
];

export function StaffConsole({ section }: { section: Section }) {
  const { staffRole, navigate } = usePortal();

  if (!staffRole) {
    return (
      <Card title="Staff only">
        <p className="text-sm text-slate-700">
          This area is for portal staff, and your account does not have a staff role. Staff roles are assigned by the deployment, not requested here.
        </p>
        <p className="mt-3 text-sm">
          <a className="text-sky-800 underline" href={href({ name: 'dashboard' })}>
            Go to your dashboard
          </a>
        </p>
      </Card>
    );
  }

  const tabs = SECTIONS.filter((s) => s.allowed(staffRole)).map(({ id, label }) => ({ id, label }));
  const allowed = tabs.some((t) => t.id === section);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Staff console</h1>
        <p className="text-sm text-slate-600">
          Your role: <Badge tone="amber">{ROLE_LABELS[staffRole] ?? staffRole}</Badge>
        </p>
      </div>

      <Notice tone="warn">Staff roles are assigned by the deployment; nothing here can change a role.</Notice>

      <Tabs tabs={tabs} active={allowed ? section : ''} onChange={(id) => navigate({ name: 'staff', section: id as Section })} />

      {!allowed ? (
        <Card>
          <p className="text-sm text-slate-700">Your role does not include this. The database enforces this regardless of what this page shows.</p>
          {tabs.length > 0 && <p className="mt-2 text-sm text-slate-600">Choose one of the sections above that your role does include.</p>}
        </Card>
      ) : section === 'invites' ? (
        <InvitesPanel />
      ) : section === 'support' ? (
        <SupportTriage />
      ) : (
        <ContentStudio />
      )}
    </div>
  );
}
