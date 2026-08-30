import React from 'react'
import {
  GATE_POINTS,
  isAttested,
  isAttestedRecord,
  type ControlledRecord,
  type GateStrip,
  type Proof,
  type PanelKind,
  type RecordStatus,
} from '../core/types'
import type { FreezeStatus } from '../core/build-freeze'
import { freezeMessage } from '../core/build-freeze'

// ── Panel ─────────────────────────────────────────────────────────────────

export function Panel({
  kind,
  title,
  purpose,
  alert = false,
  children,
}: {
  kind: PanelKind
  title: string
  purpose: string
  alert?: boolean
  children: React.ReactNode
}) {
  return (
    <section className={`panel${alert ? ' panel--alert' : ''}`}>
      <p className="panel__eyebrow">{kind}</p>
      <h2 className="panel__title">{title}</h2>
      <p className="panel__purpose">{purpose}</p>
      {children}
    </section>
  )
}

// ── Gate strip — nine points, one per Release Gate point ──────────────────

export function GateDots({ gate }: { gate: GateStrip }) {
  const passed = gate.filter(Boolean).length
  return (
    <span
      className="gate"
      role="img"
      aria-label={`Release gate: ${passed} of 9 points passed. ${
        gate[7] ? '' : 'Event ID not assigned.'
      }`}
      title={GATE_POINTS.map(
        (p, i) => `${i + 1}. ${p} — ${gate[i] ? 'passed' : 'open'}`,
      ).join('\n')}
    >
      {gate.map((passedPoint, i) => (
        <span
          key={i}
          className={[
            'gate__dot',
            passedPoint ? 'gate__dot--passed' : '',
            i === 7 ? 'gate__dot--eventid' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </span>
  )
}

// ── Status ────────────────────────────────────────────────────────────────

function statusClass(status: RecordStatus): string {
  if (isAttested(status)) return 'status--attested'
  switch (status) {
    case 'BUILT':
      return 'status--built'
    case 'CONDITIONAL':
      return 'status--conditional'
    case 'EXCLUDED':
    case 'SUPERSEDED':
      return 'status--superseded'
    case 'UNKNOWN':
      return 'status--unknown'
    default:
      return 'status--draft'
  }
}

export function Status({ status }: { status: RecordStatus }) {
  return <span className={`status ${statusClass(status)}`}>{status}</span>
}

// ── Controlled record row ─────────────────────────────────────────────────

export function RecordRow({
  record,
  children,
}: {
  record: ControlledRecord
  children?: React.ReactNode
}) {
  return (
    <article className="record">
      <div>
        <span className="record__code">{record.docCode}</span>
        {record.revision && (
          <span className="record__rev">Rev. {record.revision}</span>
        )}
        <div className="record__title">{record.title}</div>
        {record.notes && <div className="flag">{record.notes}</div>}
        {isAttestedRecord(record) && <ProofLine proof={record.proof} />}
        {children}
      </div>
      <div className="record__meta">
        <GateDots gate={record.gate} />
        <Status status={record.status} />
        <span className="record__updated">{record.updated}</span>
      </div>
    </article>
  )
}

// ── Meter ─────────────────────────────────────────────────────────────────

export function Meter({
  value,
  max,
  threshold,
  unit,
  caption,
}: {
  value: number
  max: number
  threshold?: number
  unit: string
  caption?: string
}) {
  const pct = Math.min(100, (value / max) * 100)
  const met = threshold === undefined ? false : value >= threshold
  return (
    <div>
      <div className="meter__track">
        <div
          className={`meter__fill${met ? ' meter__fill--met' : ''}`}
          style={{ width: `${pct}%` }}
        />
        {threshold !== undefined && (
          <div
            className="meter__threshold"
            style={{ left: `${(threshold / max) * 100}%` }}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="meter__readout">
        <span>
          {value} {unit}
        </span>
        {threshold !== undefined && <span>threshold {threshold}</span>}
      </div>
      {caption && <p className="panel__purpose">{caption}</p>}
    </div>
  )
}

// ── Freeze stamp ──────────────────────────────────────────────────────────

export function FreezeStamp({ status }: { status: FreezeStatus }) {
  return (
    <div className="freeze" role="status">
      <span className="freeze__label">Build freeze · week of {status.weekOf}</span>
      {freezeMessage(status)}
    </div>
  )
}

// ── Empty state — names what is missing and what would fill it ────────────

export function Empty({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="empty">
      <h3 className="empty__title">{title}</h3>
      <div>{children}</div>
    </div>
  )
}

// ── Flag ──────────────────────────────────────────────────────────────────

export function Flag({
  tone = 'caution',
  children,
}: {
  tone?: 'caution' | 'permanent' | 'alert'
  children: React.ReactNode
}) {
  const cls =
    tone === 'caution'
      ? 'flag'
      : tone === 'permanent'
        ? 'flag flag--permanent'
        : 'flag flag--alert'
  return <p className={cls}>{children}</p>
}

// ── Proof form ────────────────────────────────────────────────────────────

/**
 * The evidence boundary, made into a control.
 *
 * Every place the console lets someone assert that something happened in the
 * world — a condition cleared, a hold remediated, an export taken — routes
 * through this form, and the submit is disabled until a source, a reference
 * and a verifier are present. Authoring is not evidence, so there is no path
 * that records an outcome without one.
 */
export function ProofForm({
  label,
  onSubmit,
}: {
  label: string
  onSubmit: (p: Proof) => void
}) {
  const [source, setSource] = React.useState('')
  const [reference, setReference] = React.useState('')
  const [verifiedBy, setVerifiedBy] = React.useState('')
  const complete = Boolean(source && reference && verifiedBy)

  return (
    <div style={{ display: 'grid', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
      <input
        className="nav__item"
        placeholder="Source — letter, receipt, docket, confirmation"
        aria-label="Proof source"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      />
      <input
        className="nav__item"
        placeholder="Reference — file ID, number, URL"
        aria-label="Proof reference"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
      />
      <input
        className="nav__item"
        placeholder="Verified by"
        aria-label="Verified by"
        value={verifiedBy}
        onChange={(e) => setVerifiedBy(e.target.value)}
      />
      <button
        className="nav__item"
        disabled={!complete}
        title={
          complete
            ? label
            : 'A source, a reference and a verifier are all required. Authoring is not evidence.'
        }
        onClick={() =>
          onSubmit({
            source,
            reference,
            verifiedBy,
            obtained: new Date().toISOString().slice(0, 10),
          })
        }
      >
        {label}
      </button>
    </div>
  )
}

/** A recorded proof, rendered the same way everywhere it appears. */
export function ProofLine({ proof }: { proof: Proof }) {
  return (
    <div className="flag flag--permanent">
      Proof: {proof.source} · {proof.reference} · verified {proof.obtained} by{' '}
      {proof.verifiedBy}
    </div>
  )
}
