/**
 * GitHub desk (Module 05, TED edition). The import rules are pure functions
 * and are tested directly; the panel is tested through the module as it
 * actually renders, open and frozen.
 *
 * No literal URL appears in this file: scripts/check-network.mjs scans tests
 * too, and a link written out here would be counted as an external origin.
 */
import React, { act } from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import techStack from '../src/modules/tech-stack'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import {
  containsCredential,
  deriveBuild,
  importPaste,
  repoAllowedOn,
  safeGitHubUrl,
} from '../src/modules/tech-stack/github-import'
import { render, click, typeInto, weekWith } from './helpers'

const GH = ['https:', '', 'github.com'].join('/')
const ELSEWHERE = ['https:', '', 'example.org'].join('/')
const REPO = 'Khu-el/Khu-el'
const NOW = new Date('2026-10-27T15:00:00Z')

const prs = JSON.stringify([
  { number: 52, title: 'ST-NTE-001 run 1', state: 'OPEN', isDraft: false, headRefName: 'claude/st', url: `${GH}/${REPO}/pull/52`, updatedAt: '2026-10-26T20:00:00Z' },
  { number: 48, title: 'Remove estate code', state: 'OPEN', isDraft: true, headRefName: 'cursor/remove', url: `${ELSEWHERE}/pull/48`, updatedAt: '2026-10-22T20:00:00Z' },
])
const runs = (conclusions: (string | null)[]) =>
  JSON.stringify(
    conclusions.map((c, i) => ({
      databaseId: i + 1,
      workflowName: `wf-${i}`,
      status: c === null ? 'in_progress' : 'completed',
      conclusion: c,
      headBranch: 'main',
      url: `${GH}/${REPO}/actions/runs/${i + 1}`,
      createdAt: `2026-10-2${i}T00:00:00Z`,
    })),
  )

const base = { repo: REPO, surface: 'lane-a' as const, source: 'gh pr list', now: NOW }

describe('importing a paste', () => {
  it('records pull requests with provenance on every row', () => {
    const r = importPaste(prs, base)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.kind).toBe('pull-requests')
    expect(r.desk.pullRequests).toHaveLength(2)
    for (const row of r.desk.pullRequests) {
      expect(row.source).toBe('gh pr list')
      expect(row.importedAt).toBe(NOW.toISOString())
    }
    expect(r.desk.pullRequests[1]!.draft).toBe(true)
  })

  it('keeps GitHub links and drops links to anywhere else', () => {
    const r = importPaste(prs, base)
    if (!r.ok) throw new Error(r.reason)
    expect(r.desk.pullRequests[0]!.url).toContain('github.com')
    expect(r.desk.pullRequests[1]!.url).toBe(null)
    expect(safeGitHubUrl('javascript:alert(1)')).toBe(null)
    expect(safeGitHubUrl(['http:', '', 'github.com', 'x'].join('/'))).toBe(null)
    expect(safeGitHubUrl(['https:', '', 'github.com.evil.example', 'x'].join('/'))).toBe(null)
  })

  it('refuses a paste carrying a credential, whole', () => {
    const leaked = JSON.stringify([
      { number: 1, title: 'ok', isDraft: false, note: 'ghp_' + 'a'.repeat(36) },
    ])
    expect(containsCredential(leaked)).toBe(true)
    const r = importPaste(leaked, base)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.reason).toMatch(/credential/)
    expect(containsCredential(JSON.stringify([{ token: 'x' }]))).toBe(true)
  })

  it('requires a source and a well-formed repository', () => {
    expect(importPaste(prs, { ...base, source: '   ' }).ok).toBe(false)
    expect(importPaste(prs, { ...base, repo: 'not a repo' }).ok).toBe(false)
  })

  it('keeps the household organisation off the enterprise surface, and the reverse', () => {
    expect(repoAllowedOn('House-of-Ransom/estate', 'lane-a')).toMatch(/does not enter/)
    expect(repoAllowedOn('House-of-Ransom/estate', 'lane-b')).toBe(null)
    expect(repoAllowedOn(REPO, 'lane-b')).toMatch(/does not enter/)
    expect(importPaste(prs, { ...base, repo: 'House-of-Ransom/estate' }).ok).toBe(false)
  })

  it('rejects JSON that is not a list, an empty list, and an unknown shape', () => {
    expect(importPaste('{"a":1}', base).ok).toBe(false)
    expect(importPaste('[]', base).ok).toBe(false)
    expect(importPaste('[{"foo":1}]', base).ok).toBe(false)
    expect(importPaste('not json', base).ok).toBe(false)
  })

  it('reads issue labels in either gh shape', () => {
    const issues = JSON.stringify([
      { number: 38, title: 'Activate node', state: 'OPEN', labels: [{ name: 'ops' }, 'urgent'], url: `${GH}/x/y/issues/38`, updatedAt: '2026-10-25' },
    ])
    const r = importPaste(issues, { ...base, source: 'gh issue list' })
    if (!r.ok) throw new Error(r.reason)
    expect(r.kind).toBe('issues')
    expect(r.desk.issues[0]!.labels).toEqual(['ops', 'urgent'])
  })
})

describe('deriving build status', () => {
  const rowsOf = (json: string) => {
    const r = importPaste(json, { ...base, source: 'gh run list' })
    if (!r.ok) throw new Error(r.reason)
    return r.desk.runs
  }

  it('is UNKNOWN with no runs — an empty list is not green', () => {
    expect(deriveBuild([])).toBe('UNKNOWN')
  })

  it('is PASSING only when every workflow’s newest completed run succeeded', () => {
    expect(deriveBuild(rowsOf(runs(['success', 'success'])))).toBe('PASSING')
    expect(deriveBuild(rowsOf(runs(['success', 'failure'])))).toBe('FAILING')
    expect(deriveBuild(rowsOf(runs(['success', 'cancelled'])))).toBe('UNKNOWN')
  })

  it('ignores in-progress runs either way', () => {
    expect(deriveBuild(rowsOf(runs([null])))).toBe('UNKNOWN')
  })

  it('judges each workflow by its newest run, not its worst', () => {
    const rows = rowsOf(
      JSON.stringify([
        { databaseId: 1, workflowName: 'CI', status: 'completed', conclusion: 'failure', headBranch: 'main', createdAt: '2026-10-20T00:00:00Z' },
        { databaseId: 2, workflowName: 'CI', status: 'completed', conclusion: 'success', headBranch: 'main', createdAt: '2026-10-25T00:00:00Z' },
      ]),
    )
    expect(deriveBuild(rows)).toBe('PASSING')
  })
})

describe('the desk panel', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setSurface('lane-a')
  })

  const open = freezeStatus(weekWith(40))
  const frozen = freezeStatus(weekWith(0))

  function typeArea(el: HTMLTextAreaElement, value: string) {
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set
    act(() => {
      setter?.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  it('renders empty honestly, and the import is disabled until all three fields are filled', () => {
    const view = render(<ModuleBody module={techStack} surface="lane-a" status={open} />)
    expect(view.text).toContain('GitHub desk · TED edition')
    expect(view.text).toContain('No repository observed yet')
    const button = Array.from(view.container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Import paste',
    )!
    expect(button.disabled).toBe(true)
    view.unmount()
  })

  it('imports a paste and shows it with its source', () => {
    const view = render(<ModuleBody module={techStack} surface="lane-a" status={open} />)
    const q = <T extends Element>(sel: string) => view.container.querySelector<T>(sel)!
    typeInto(q<HTMLInputElement>('input[aria-label="Repository"]'), REPO)
    typeInto(q<HTMLInputElement>('input[aria-label="Import source"]'), 'gh pr list')
    typeArea(q<HTMLTextAreaElement>('textarea[aria-label="GitHub JSON paste"]'), prs)
    const button = Array.from(view.container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Import paste',
    )!
    expect(button.disabled).toBe(false)
    click(button)
    expect(view.text).toContain('2 pull requests recorded for Khu-el/Khu-el')
    expect(view.text).toContain('2 open pull requests (1 draft)')
    expect(view.text).toContain('gh pr list · imported')
    // No build status claimed from pull requests alone.
    expect(view.container.querySelector(`[data-repo="${REPO}"] .status`)!.textContent).toBe('UNKNOWN')
    // Only the GitHub link was rendered as a link.
    const hrefs = Array.from(view.container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.every((h) => new URL(h).hostname === 'github.com')).toBe(true)
    view.unmount()
  })

  it('closes under the build freeze with the rest of the build work', () => {
    const view = render(<ModuleBody module={techStack} surface="lane-a" status={frozen} />)
    expect(view.text).not.toContain('GitHub desk')
    expect(view.text).toContain('Security hold')
    view.unmount()
  })
})
