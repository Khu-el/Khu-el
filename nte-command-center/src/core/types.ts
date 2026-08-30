/**
 * NTE-TECH-2026-CCENTER-001 — core types
 *
 * The evidence boundary is enforced here, at the type level, on purpose.
 * Authoring an artifact never proves execution, signature, filing, service,
 * payment, deployment, licensing, or outcome. So the statuses that assert an
 * external event cannot be constructed without a proof source.
 */

export type Surface = 'lane-a' | 'lane-b' | 'practice'

export type Lane = 'A' | 'B' | 'PERSONAL' | 'PRACTICE'

/** Statuses that assert only authorship. Free to use. */
export type AuthoredStatus =
  | 'PLANNED'
  | 'SPECIFIED'
  | 'DRAFT'
  | 'PARTIAL'
  | 'BUILT'
  | 'CONDITIONAL'
  | 'SUPERSEDED'
  | 'EXCLUDED'
  | 'UNKNOWN'

/** Statuses that assert an external event. Require proof. */
export type AttestedStatus =
  | 'EXECUTED'
  | 'FILED'
  | 'SERVED'
  | 'PAID'
  | 'DEPLOYED'
  | 'RELEASED'

export type RecordStatus = AuthoredStatus | AttestedStatus

/**
 * Where a claim about the outside world came from. Without one of these,
 * an AttestedStatus is not representable.
 */
export interface Proof {
  /** What the claim rests on: a file, a receipt, a docket, a confirmation. */
  source: string
  /** Stable reference — file ID, URL, docket number, confirmation number. */
  reference: string
  /** ISO date the proof was obtained, not the date of the event. */
  obtained: string
  /** Who verified it. */
  verifiedBy: string
}

/** Nine-Point Release Gate. Point 8 is Event ID and is the usual blocker. */
export type GateStrip = [
  boolean, boolean, boolean, boolean, boolean,
  boolean, boolean, boolean, boolean,
]

export const GATE_POINTS = [
  'Scope and authority confirmed',
  'Entity and capacity correct',
  'Lane firewall clear',
  'Prohibited language scan clear',
  'Compliance conditions cleared',
  'Document control complete',
  'Review and sign-off',
  'Event ID assigned',
  'Seal and execution',
] as const

export const EMPTY_GATE: GateStrip = [
  false, false, false, false, false, false, false, false, false,
]

interface RecordBase {
  id: string
  /** Enterprise document code. A record without one does not enter a register. */
  docCode: string
  title: string
  revision?: string
  lane: Lane
  eventId: string | null
  gate: GateStrip
  updated: string
  /** Where this row came from, if imported rather than seeded. */
  source?: string
  importedAt?: string
  notes?: string
}

/** A record whose status asserts only authorship. */
export interface AuthoredRecord extends RecordBase {
  status: AuthoredStatus
  proof?: never
}

/** A record whose status asserts an external event. Proof is mandatory. */
export interface AttestedRecord extends RecordBase {
  status: AttestedStatus
  proof: Proof
}

export type ControlledRecord = AuthoredRecord | AttestedRecord

/** Runtime guard mirroring the type-level rule, for imported data. */
const ATTESTED: ReadonlySet<string> = new Set<AttestedStatus>([
  'EXECUTED', 'FILED', 'SERVED', 'PAID', 'DEPLOYED', 'RELEASED',
])

export function isAttested(status: string): status is AttestedStatus {
  return ATTESTED.has(status)
}

/**
 * Validate an untrusted row before it enters a register. Returns the reason it
 * was rejected, or null if it may enter. Rejected rows are downgraded to
 * UNKNOWN by the importer — never dropped silently, never accepted as claimed.
 */
export function rejectReason(row: Partial<ControlledRecord>): string | null {
  if (!row.docCode) return 'no document code'
  if (!row.status) return 'no status'
  if (isAttested(row.status) && !row.proof) {
    return `status ${row.status} asserts an external event and carries no proof`
  }
  return null
}

// ── Conditions precedent ──────────────────────────────────────────────────

export type CpType = 'administrative' | 'drafting' | 'review' | 'build'

export interface ConditionPrecedent {
  /** Canonical Q-series id. The four legacy systems reconcile to this. */
  id: string
  /** Every id this condition has been called across the four numbering
   *  systems. Rendering these inline is what prevents a false "cleared". */
  aliases: string[]
  title: string
  critical: boolean
  type: CpType
  /** Q-ids this condition blocks. */
  blocks: string[]
  /** Q-ids that must clear first. */
  dependsOn: string[]
  cleared: boolean
  /** Clearing requires proof. The control is disabled without it. */
  proof?: Proof
  opened: string
}

export function canClear(cp: ConditionPrecedent): boolean {
  return Boolean(cp.proof)
}

// ── Modules ───────────────────────────────────────────────────────────────

export type PanelKind = 'register' | 'gate' | 'meter' | 'ledger' | 'board'

export interface PanelDefinition {
  id: string
  kind: PanelKind
  title: string
  /** One line saying what the panel is for, in the user's terms. */
  purpose: string
}

export interface ModuleDefinition {
  id: string
  /** Two-digit ordinal from MODULE-SPECS.md. Order carries meaning here. */
  ordinal: string
  title: string
  eyebrow: string
  surfaces: Surface[]
  /** true = locks under the build freeze below 40 contacts. */
  buildWork: boolean
  panels: PanelDefinition[]
  Component: React.ComponentType<{ surface: Surface }>
  /**
   * Rendered above the freeze stamp when the module is locked.
   *
   * The freeze closes build work. It does not close a standing security hold
   * or a finished plan someone needs to read — neither is build work, and a
   * hold that vanishes below 40 contacts is worse than no hold at all. A
   * module that needs part of itself to stay readable declares that part
   * here; everything else still locks.
   */
  FreezeExempt?: React.ComponentType<{ surface: Surface }>
}

/**
 * Narrow a record, not just its status string. Needed because a status guard
 * tells you what the status is but not which arm of the union you hold — and
 * the whole point of the split is that proof is reachable on one arm only.
 */
export function isAttestedRecord(
  record: ControlledRecord,
): record is AttestedRecord {
  return isAttested(record.status)
}
