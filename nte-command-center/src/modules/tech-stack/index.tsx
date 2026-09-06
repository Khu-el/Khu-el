/**
 * Module 05 · Tech Stack
 *
 * Built third, out of numeric order, because it carries the security hold and
 * an open plaintext credential file in a synced vault outranks the rest of the
 * board.
 *
 * Shape copied from module 01: seed as data, storage for state, controlled
 * records through the shared components, a Reset to seed control. Three things
 * are specific to this module and none of them is decoration:
 *
 *   - The hold renders first, is the first focusable element, and has no
 *     collapse or dismiss control. It is also declared FreezeExempt, so it
 *     survives the build freeze — a hold that disappears below 40 contacts is
 *     worse than no hold at all.
 *   - The unified OS gate is two steps and the second is `disabled` until the
 *     first carries proof. Disabled at the control, not hidden by styling.
 *   - The external-request count is read from seed/network-scan.json, which
 *     scripts/check-network.mjs writes on every build, dev start and test run.
 *     Nobody typed that number.
 */

import React, { useState } from 'react'
import type { ModuleDefinition, Proof, Surface } from '../../core/types'
import { Panel, Empty, Flag, ProofForm, ProofLine } from '../../ui/components'
import { load, save } from '../../core/storage'
import seed from '../../../seed/tech-stack.json'
import scan from '../../../seed/network-scan.json'

interface SecurityHold {
  id: string
  docCode: string
  title: string
  raisedBy: string
  raised: string
  condition: string
  statement: string
  remediation: string[]
  proof: Proof | null
}

interface Application {
  id: string
  docCode: string
  title: string
  surface: string
  status: string
  externalRequests: number | null | 'MEASURED'
  docCodeProvisional?: boolean
  notes?: string
}

interface OsStep {
  id: string
  title: string
  why: string
  requires?: string
  proof: Proof | null
}

interface UnifiedOs {
  docCode: string
  title: string
  canonicalSource: {
    determination: string
    serverFiles: number
    clientFiles: string
    schema: string
    cicd: string
    verified: string
  }
  steps: OsStep[]
}

interface Repository {
  id: string
  name: string
  buildStatus: string
  dependencyUpdates: string
  activationPriority: string
  techDebt: string
  note?: string
}

interface Defect {
  id: string
  title: string
  severity: string
  detail: string
  reference: string
  resolution: string
  proof: Proof | null
}

interface TechStackData {
  securityHold: SecurityHold
  applications: Application[]
  unifiedOs: UnifiedOs
  repoHealth: {
    cadence: string
    lastRun: string
    checks: string[]
    repositories: Repository[]
  }
  defects: Defect[]
}

const KEY = 'tech-stack'
const SEED = seed as unknown as TechStackData

function useTechStack() {
  const [data, setData] = useState<TechStackData>(() => load<TechStackData>(KEY, SEED))
  const update = (next: TechStackData) => {
    save(KEY, next)
    setData(next)
  }
  return { data, update }
}

// ── The hold ──────────────────────────────────────────────────────────────

/**
 * Rendered above everything in the module, and again above the freeze stamp
 * when the module is locked. There is no collapse, no dismiss, and no state in
 * which this panel is absent — the only thing that changes it is a recorded
 * proof of remediation, and even then it stays on the board.
 */
export function SecurityHoldPanel({
  hold,
  onRemediate,
}: {
  hold: SecurityHold
  onRemediate?: (p: Proof) => void
}) {
  const [recording, setRecording] = useState(false)
  const remediated = Boolean(hold.proof)

  return (
    <Panel
      kind="gate"
      title={`Security hold · ${hold.title}`}
      purpose="This outranks the whole board. It is not dismissible and it does not collapse."
      alert={!remediated}
    >
      <Flag tone={remediated ? 'permanent' : 'alert'}>
        {hold.docCode} · raised {hold.raised} by {hold.raisedBy} · condition{' '}
        {hold.condition} · {remediated ? 'REMEDIATED' : 'OPEN'}
      </Flag>
      <p className="panel__purpose" style={{ marginTop: 'var(--s3)' }}>
        {hold.statement}
      </p>
      <ol className="panel__purpose">
        {hold.remediation.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {hold.proof ? (
        <ProofLine proof={hold.proof} />
      ) : onRemediate ? (
        <>
          <button className="nav__item" onClick={() => setRecording(!recording)}>
            {recording ? 'Cancel' : 'Record remediation proof'}
          </button>
          {recording && (
            <ProofForm
              label="Record remediation"
              onSubmit={(p) => {
                onRemediate(p)
                setRecording(false)
              }}
            />
          )}
        </>
      ) : (
        <Flag tone="alert">
          Remediation is recorded from the module, which is closed this week.
          The hold is not.
        </Flag>
      )}
    </Panel>
  )
}

/** What the module shows when the freeze has closed everything else. */
function TechStackFrozen() {
  const { data } = useTechStack()
  return <SecurityHoldPanel hold={data.securityHold} />
}

// ── The module ────────────────────────────────────────────────────────────

function externalRequestLabel(app: Application): string {
  if (app.externalRequests === 'MEASURED') {
    return `${scan.externalRequests} external requests · measured across ${scan.filesScanned} files`
  }
  if (app.externalRequests === null) {
    return 'External requests UNKNOWN — source not in this workspace'
  }
  return `${app.externalRequests} external requests`
}

function TechStackModule({ surface }: { surface: Surface }) {
  const { data, update } = useTechStack()
  const [openStep, setOpenStep] = useState<string | null>(null)

  const reset = () => update(SEED)

  const proveStep = (id: string, proof: Proof) => {
    update({
      ...data,
      unifiedOs: {
        ...data.unifiedOs,
        steps: data.unifiedOs.steps.map((s) =>
          s.id === id ? { ...s, proof } : s,
        ),
      },
    })
    setOpenStep(null)
  }

  const proven = (id: string): boolean =>
    Boolean(data.unifiedOs.steps.find((s) => s.id === id)?.proof)

  return (
    <>
      <SecurityHoldPanel
        hold={data.securityHold}
        onRemediate={(proof) =>
          update({ ...data, securityHold: { ...data.securityHold, proof } })
        }
      />

      <Panel
        kind="register"
        title="Application register"
        purpose="What exists, where it is hosted, and how many outside origins it reaches. One row is measured; the rest say so."
      >
        {data.applications.map((app) => (
          <article className="record" key={app.id}>
            <div>
              <span className="record__code">{app.docCode}</span>
              {app.docCodeProvisional && (
                <span className="record__rev">code provisional</span>
              )}
              <div className="record__title">{app.title}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                {app.surface} · {externalRequestLabel(app)}
              </div>
              {app.notes && <Flag tone="permanent">{app.notes}</Flag>}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  app.status === 'UNKNOWN' ? 'status--unknown' : 'status--draft'
                }`}
              >
                {app.status}
              </span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title={data.unifiedOs.title}
        purpose="Two steps in order. Export and hash first; deployment is unreachable until that step carries proof."
      >
        <Flag tone="permanent">
          Canonical source: {data.unifiedOs.canonicalSource.determination}{' '}
          {data.unifiedOs.canonicalSource.serverFiles} server files ·{' '}
          {data.unifiedOs.canonicalSource.clientFiles} client files ·{' '}
          {data.unifiedOs.canonicalSource.schema} ·{' '}
          {data.unifiedOs.canonicalSource.cicd} · independently verified:{' '}
          {data.unifiedOs.canonicalSource.verified}
        </Flag>
        {data.unifiedOs.steps.map((step, i) => {
          const blocked = step.requires ? !proven(step.requires) : false
          return (
            <article className="record" key={step.id}>
              <div>
                <span className="record__code">{step.id}</span>
                <div className="record__title">
                  Step {i + 1} · {step.title}
                </div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {step.why}
                </div>
                {blocked && (
                  <Flag>
                    Unreachable until {step.requires} carries proof. Not styled
                    shut — the control below is disabled.
                  </Flag>
                )}
                {step.proof && <ProofLine proof={step.proof} />}
                {openStep === step.id && !blocked && !step.proof && (
                  <ProofForm
                    label={`Record proof for ${step.id}`}
                    onSubmit={(p) => proveStep(step.id, p)}
                  />
                )}
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    step.proof
                      ? 'status--built'
                      : blocked
                        ? 'status--unknown'
                        : 'status--conditional'
                  }`}
                >
                  {step.proof ? 'PROVEN' : blocked ? 'UNREACHABLE' : 'OPEN'}
                </span>
                {!step.proof && (
                  <button
                    className="nav__item"
                    disabled={blocked}
                    aria-disabled={blocked}
                    title={
                      blocked
                        ? `Blocked: ${step.requires} carries no proof.`
                        : 'Record the proof for this step'
                    }
                    onClick={() =>
                      setOpenStep(openStep === step.id ? null : step.id)
                    }
                  >
                    {openStep === step.id ? 'Cancel' : 'Record proof'}
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </Panel>

      <Panel
        kind="board"
        title="Repository health"
        purpose={`${data.repoHealth.cadence} check · last run ${data.repoHealth.lastRun}. ${data.repoHealth.checks.join(' · ')}.`}
      >
        {data.repoHealth.repositories.map((r) => (
          <article className="record" key={r.id}>
            <div>
              <span className="record__code">{r.id}</span>
              <div className="record__title">{r.name}</div>
              <div className="panel__purpose" style={{ margin: 0 }}>
                Dependencies {r.dependencyUpdates} · priority{' '}
                {r.activationPriority} · debt {r.techDebt}
              </div>
              {r.note && <Flag tone="permanent">{r.note}</Flag>}
            </div>
            <div className="record__meta">
              <span
                className={`status ${
                  r.buildStatus === 'PASSING'
                    ? 'status--built'
                    : 'status--unknown'
                }`}
              >
                {r.buildStatus}
              </span>
            </div>
          </article>
        ))}
      </Panel>

      <Panel
        kind="gate"
        title="Open defects"
        purpose="Two open defects besides the hold. Neither is closed by noticing it."
        alert={data.defects.some((d) => !d.proof)}
      >
        {data.defects.length === 0 ? (
          <Empty title="No defects recorded">
            An empty defect register means nobody has looked, not that nothing
            is wrong.
          </Empty>
        ) : (
          data.defects.map((d) => (
            <article className="record" key={d.id}>
              <div>
                <span className="record__code">{d.id}</span>
                <span className="record__rev">ref {d.reference}</span>
                <div className="record__title">{d.title}</div>
                <div className="panel__purpose" style={{ margin: 0 }}>
                  {d.detail}
                </div>
                <Flag>{d.resolution}</Flag>
                {d.proof && <ProofLine proof={d.proof} />}
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    d.proof ? 'status--built' : 'status--conditional'
                  }`}
                >
                  {d.proof ? 'RESOLVED' : 'OPEN'}
                </span>
              </div>
            </article>
          ))
        )}
      </Panel>

      <button className="nav__item" onClick={reset}>
        Reset to seed
      </button>
    </>
  )
}

const definition: ModuleDefinition = {
  id: 'tech-stack',
  ordinal: '05',
  title: 'Tech Stack',
  eyebrow: 'Repositories and health',
  surfaces: ['lane-a'],
  buildWork: true,
  panels: [
    { id: 'hold', kind: 'gate', title: 'Security hold', purpose: 'Outranks the board.' },
    { id: 'applications', kind: 'register', title: 'Application register', purpose: 'What exists and what it reaches.' },
    { id: 'unified-os', kind: 'gate', title: 'Unified OS V2', purpose: 'Export and hash before deploy.' },
    { id: 'repo-health', kind: 'board', title: 'Repository health', purpose: 'Bi-weekly check.' },
    { id: 'defects', kind: 'gate', title: 'Open defects', purpose: 'Collision, seals, hold.' },
  ],
  Component: TechStackModule,
  FreezeExempt: TechStackFrozen,
}

export default definition
