import { Card } from '@nte/governance-core';
import { COMPLIANCE_GUARDRAILS, CRM_GOVERNANCE_RULES, DATA_DICTIONARY, OBJECTIONS, SCRIPTS, TARGET_MEANINGS } from '../data';

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-neutral-100 align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? 'font-medium text-neutral-900 whitespace-nowrap' : 'text-neutral-700'}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PlaybookTab() {
  return (
    <div className="space-y-4">
      <Card title="Scripts Library" subtitle="Use as a field reference. Adjust tone to your own voice and comply with approved materials.">
        <div className="space-y-4">
          {SCRIPTS.map((s) => (
            <div key={s.scenario} className="border border-neutral-200 rounded-lg p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-neutral-900">{s.scenario}</p>
                <p className="text-xs text-neutral-500">Goal: {s.goal}</p>
              </div>
              <p className="text-sm text-neutral-800 mt-2">“{s.script}”</p>
              <p className="text-sm text-neutral-800 mt-2">
                <span className="font-medium">Close:</span> “{s.close}”
              </p>
              <p className="text-xs text-neutral-500 mt-2">{s.notes}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Objection Matrix" subtitle="Formula: Acknowledge → Pivot → Close.">
        <Table head={['Objection', 'Acknowledge', 'Pivot', 'Close', 'What not to do', 'Notes']} rows={OBJECTIONS.map((o) => [o.objection, o.acknowledge, o.pivot, o.close, o.avoid, o.notes])} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Compliance guardrails" subtitle="Use current, company-approved materials and current licensing boundaries.">
          <Table head={['Area', 'Operating guardrail']} rows={COMPLIANCE_GUARDRAILS.map((g) => [g.area, g.rule])} />
        </Card>
        <Card title="CRM governance rules" subtitle="Enforced by this app, not just written down.">
          <Table head={['Rule', 'Operational meaning']} rows={CRM_GOVERNANCE_RULES.map((g) => [g.rule, g.meaning])} />
        </Card>
      </div>

      <Card title="Activity standard">
        <Table head={['Metric', 'Daily target', 'Operating meaning']} rows={TARGET_MEANINGS.map((t) => [t.metric, String(t.target), t.meaning])} />
      </Card>

      <Card title="Data dictionary & field ownership">
        <Table head={['Field', 'Purpose', 'Owner / authority', 'Rule', 'Notes']} rows={DATA_DICTIONARY.map((d) => [d.field, d.purpose, d.owner, d.rule, d.notes])} />
      </Card>
    </div>
  );
}
