/**
 * GitHub desk — the import half.
 *
 * The repository-health board had one observed row and three UNKNOWNs because
 * nothing fed it. This is the feed, and it obeys the same rules as every other
 * import into the console (docs/ARCHITECTURE.md, "Data flow"):
 *
 *   - Manual paste only. Nothing here requests anything. The operator runs
 *     `gh ... --json ...` themselves and pastes the output.
 *   - Every row records `source` and `importedAt`. A row with no provenance
 *     does not enter the desk.
 *   - A paste that carries anything shaped like a credential is refused whole
 *     (CLAUDE.md §10: "If you find plaintext credentials in any imported data,
 *     stop"). Nothing from it is kept — not even the harmless rows.
 *   - Only links to the GitHub host survive. Anything else is dropped to null,
 *     so the desk never renders a pasted link to somewhere else.
 *   - The firewall applies to repositories too: a Lane B organisation's repo
 *     never enters a Lane A surface.
 *
 * Build status is derived, never typed: PASSING only when the newest run of
 * every workflow in the paste concluded `success`; FAILING when any newest run
 * failed; UNKNOWN otherwise. An empty paste is UNKNOWN, not PASSING.
 */

import type { Surface } from '../../core/types'

export type GitHubKind = 'pull-requests' | 'issues' | 'runs'

export interface PullRequestRow {
  number: number
  title: string
  state: string
  draft: boolean
  branch: string | null
  url: string | null
  updated: string | null
}

export interface IssueRow {
  number: number
  title: string
  state: string
  labels: string[]
  url: string | null
  updated: string | null
}

export interface RunRow {
  id: number | string
  workflow: string
  status: string
  conclusion: string | null
  branch: string | null
  url: string | null
  created: string | null
}

export interface ImportStamp {
  source: string
  importedAt: string
}

export interface RepoDesk {
  repo: string
  pullRequests: (PullRequestRow & ImportStamp)[]
  issues: (IssueRow & ImportStamp)[]
  runs: (RunRow & ImportStamp)[]
}

export type ImportResult =
  | { ok: true; kind: GitHubKind; rows: number; desk: RepoDesk }
  | { ok: false; reason: string }

export type DerivedBuild = 'PASSING' | 'FAILING' | 'UNKNOWN'

/** The commands the panel tells the operator to run. Field lists match the parser. */
export const GH_COMMANDS: Record<GitHubKind, string> = {
  'pull-requests':
    'gh pr list --repo OWNER/REPO --state open --json number,title,state,isDraft,headRefName,url,updatedAt',
  issues:
    'gh issue list --repo OWNER/REPO --state open --json number,title,state,labels,url,updatedAt',
  runs:
    'gh run list --repo OWNER/REPO --limit 30 --json databaseId,workflowName,status,conclusion,headBranch,url,createdAt',
}

/**
 * Shapes of secrets that must never be stored. GitHub token prefixes, private
 * key headers, and the generic `token`/`password`/`secret` key in JSON.
 */
const CREDENTIAL_SHAPES: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /"(?:token|password|secret|access_token|api_key)"\s*:/i,
]

/** Organisations whose repositories belong to Lane B. Lower-case. */
const LANE_B_OWNERS = ['house-of-ransom']

const REPO_SHAPE = /^[A-Za-z0-9-]{1,39}\/[A-Za-z0-9._-]{1,100}$/

export function containsCredential(text: string): boolean {
  return CREDENTIAL_SHAPES.some((re) => re.test(text))
}

/** Keep a link only if it is an https link on the GitHub host. */
export function safeGitHubUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const u = new URL(value)
    if (u.protocol !== 'https:') return null
    if (u.hostname !== 'github.com') return null
    return u.toString()
  } catch {
    return null
  }
}

export function repoAllowedOn(repo: string, surface: Surface): string | null {
  if (!REPO_SHAPE.test(repo)) {
    return 'Repository must be written OWNER/REPO.'
  }
  const owner = repo.split('/')[0]!.toLowerCase()
  const laneB = LANE_B_OWNERS.includes(owner)
  if (laneB && surface !== 'lane-b') {
    return `${repo} belongs to the household organisation. It does not enter this surface.`
  }
  if (!laneB && surface === 'lane-b') {
    return `${repo} is not a household repository. It does not enter this surface.`
  }
  return null
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function detectKind(row: Record<string, unknown>): GitHubKind | null {
  if ('workflowName' in row || 'conclusion' in row) return 'runs'
  if ('isDraft' in row || 'headRefName' in row) return 'pull-requests'
  if ('number' in row && 'title' in row) return 'issues'
  return null
}

export function emptyDesk(repo: string): RepoDesk {
  return { repo, pullRequests: [], issues: [], runs: [] }
}

/**
 * Parse one paste into the desk for `repo`. The paste replaces that kind's
 * rows for that repo wholesale — a fresh `gh` listing is the whole current
 * truth, so merging would keep rows GitHub has since closed.
 */
export function importPaste(
  text: string,
  opts: {
    repo: string
    surface: Surface
    source: string
    desk?: RepoDesk
    now?: Date
  },
): ImportResult {
  const repoProblem = repoAllowedOn(opts.repo, opts.surface)
  if (repoProblem) return { ok: false, reason: repoProblem }

  const source = opts.source.trim()
  if (!source) {
    return { ok: false, reason: 'Name the source — the command you ran, or where the paste came from.' }
  }

  if (containsCredential(text)) {
    return {
      ok: false,
      reason:
        'The paste contains something shaped like a credential. Nothing was imported. Remove it at the source and run the command again.',
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Not JSON. Paste the output of a gh command run with --json.' }
  }
  if (!Array.isArray(parsed)) {
    return { ok: false, reason: 'Expected a JSON list, as gh … --json prints.' }
  }

  const desk = opts.desk && opts.desk.repo === opts.repo ? opts.desk : emptyDesk(opts.repo)
  const stamp: ImportStamp = {
    source,
    importedAt: (opts.now ?? new Date()).toISOString(),
  }

  if (parsed.length === 0) {
    return {
      ok: false,
      reason: 'The list is empty, so the kind cannot be told. Nothing changed.',
    }
  }

  const rows = parsed.filter(
    (r): r is Record<string, unknown> => typeof r === 'object' && r !== null,
  )
  const kind = rows.length ? detectKind(rows[0]!) : null
  if (!kind) {
    return { ok: false, reason: 'Could not tell pull requests, issues or runs apart. Use the commands shown.' }
  }

  if (kind === 'pull-requests') {
    const pullRequests = rows
      .filter((r) => typeof r.number === 'number' && str(r.title))
      .map((r) => ({
        number: r.number as number,
        title: str(r.title)!,
        state: str(r.state) ?? 'UNKNOWN',
        draft: r.isDraft === true,
        branch: str(r.headRefName),
        url: safeGitHubUrl(r.url),
        updated: str(r.updatedAt),
        ...stamp,
      }))
    return { ok: true, kind, rows: pullRequests.length, desk: { ...desk, pullRequests } }
  }

  if (kind === 'issues') {
    const issues = rows
      .filter((r) => typeof r.number === 'number' && str(r.title))
      .map((r) => ({
        number: r.number as number,
        title: str(r.title)!,
        state: str(r.state) ?? 'UNKNOWN',
        labels: Array.isArray(r.labels)
          ? r.labels
              .map((l) => (typeof l === 'string' ? l : str((l as { name?: unknown })?.name)))
              .filter((l): l is string => Boolean(l))
          : [],
        url: safeGitHubUrl(r.url),
        updated: str(r.updatedAt),
        ...stamp,
      }))
    return { ok: true, kind, rows: issues.length, desk: { ...desk, issues } }
  }

  const runs = rows
    .filter((r) => str(r.workflowName))
    .map((r) => ({
      id: typeof r.databaseId === 'number' || typeof r.databaseId === 'string' ? r.databaseId : 'UNKNOWN',
      workflow: str(r.workflowName)!,
      status: str(r.status) ?? 'UNKNOWN',
      conclusion: str(r.conclusion),
      branch: str(r.headBranch),
      url: safeGitHubUrl(r.url),
      created: str(r.createdAt),
      ...stamp,
    }))
  return { ok: true, kind, rows: runs.length, desk: { ...desk, runs } }
}

/**
 * Build status from the newest completed run of each workflow on the default
 * branch the paste names most. In-progress runs do not count either way.
 */
export function deriveBuild(runs: RunRow[], branch = 'main'): DerivedBuild {
  const onBranch = runs.filter((r) => r.branch === branch && r.status === 'completed')
  if (onBranch.length === 0) return 'UNKNOWN'
  const newest = new Map<string, RunRow>()
  for (const r of onBranch) {
    const seen = newest.get(r.workflow)
    if (!seen || (r.created ?? '') > (seen.created ?? '')) newest.set(r.workflow, r)
  }
  const conclusions = [...newest.values()].map((r) => r.conclusion)
  if (conclusions.some((c) => c === 'failure' || c === 'timed_out' || c === 'startup_failure')) {
    return 'FAILING'
  }
  if (conclusions.every((c) => c === 'success')) return 'PASSING'
  return 'UNKNOWN'
}
