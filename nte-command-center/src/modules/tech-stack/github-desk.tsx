/**
 * GitHub desk — the panel half. Import rules live in ./github-import.ts.
 *
 * TED edition, created by NTE Virtual Solutions. It turns the repository-health
 * board's UNKNOWN rows into observed ones without the console ever reaching the
 * network: the operator runs `gh`, pastes the JSON, names the source, and the
 * desk records who said what and when.
 *
 * What it will not do, by construction:
 *   - fetch anything (there is no request call in this file or its import);
 *   - render a link to a host other than GitHub;
 *   - keep a paste that carries a credential shape;
 *   - call a build PASSING from an empty or partial run list;
 *   - write anything back to GitHub. It reads; a person acts on GitHub.
 */

import React, { useState } from 'react'
import type { Surface } from '../../core/types'
import { Panel, Empty, Flag } from '../../ui/components'
import { load, save } from '../../core/storage'
import {
  GH_COMMANDS,
  deriveBuild,
  emptyDesk,
  importPaste,
  type GitHubKind,
  type ImportStamp,
  type RepoDesk,
} from './github-import'

const KEY = 'tech-stack:github-desk'

type DeskState = Record<string, RepoDesk>

function Stamp({ s }: { s: ImportStamp }) {
  return (
    <span className="record__rev">
      {s.source} · imported {s.importedAt.slice(0, 16).replace('T', ' ')} UTC
    </span>
  )
}

function Linked({ url, children }: { url: string | null; children: React.ReactNode }) {
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <>{children}</>
  )
}

export function GitHubDesk({ surface }: { surface: Surface }) {
  const [desks, setDesks] = useState<DeskState>(() => load<DeskState>(KEY, {}))
  const [repo, setRepo] = useState('')
  const [source, setSource] = useState('')
  const [paste, setPaste] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const commit = (next: DeskState) => {
    save(KEY, next)
    setDesks(next)
  }

  const runImport = () => {
    const r = repo.trim()
    const result = importPaste(paste, {
      repo: r,
      surface,
      source,
      desk: desks[r] ?? emptyDesk(r),
    })
    if (!result.ok) {
      setMessage({ ok: false, text: result.reason })
      return
    }
    commit({ ...desks, [r]: result.desk })
    setPaste('')
    setMessage({
      ok: true,
      text: `${result.rows} ${result.kind.replace('-', ' ')} recorded for ${r}.`,
    })
  }

  const remove = (r: string) => {
    const next = { ...desks }
    delete next[r]
    commit(next)
  }

  const ready = Boolean(repo.trim() && source.trim() && paste.trim())
  const names = Object.keys(desks).sort()

  return (
    <Panel
      kind="register"
      title="GitHub desk · TED edition"
      purpose="Observed repository state, by paste only. Run the command, paste its JSON, name the source. Nothing here reaches the network, and nothing here writes to GitHub. Created by NTE Virtual Solutions."
    >
      <details>
        <summary className="nav__item">Commands to run</summary>
        <ul className="panel__purpose">
          {(Object.keys(GH_COMMANDS) as GitHubKind[]).map((k) => (
            <li key={k}>
              <code>{GH_COMMANDS[k]}</code>
            </li>
          ))}
        </ul>
      </details>

      <div style={{ display: 'grid', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
        <input
          className="nav__item"
          placeholder="Repository — OWNER/REPO"
          aria-label="Repository"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <input
          className="nav__item"
          placeholder="Source — the command you ran"
          aria-label="Import source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <textarea
          className="nav__item"
          rows={5}
          placeholder="Paste gh … --json output here"
          aria-label="GitHub JSON paste"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
        />
        <button
          className="nav__item"
          disabled={!ready}
          title={ready ? 'Import this paste' : 'A repository, a source and a paste are all required.'}
          onClick={runImport}
        >
          Import paste
        </button>
        {message && (
          <Flag tone={message.ok ? 'permanent' : 'alert'}>{message.text}</Flag>
        )}
      </div>

      {names.length === 0 ? (
        <Empty title="No repository observed yet">
          An empty desk means nothing has been pasted, not that every build is
          green.
        </Empty>
      ) : (
        names.map((name) => {
          const d = desks[name]!
          const build = deriveBuild(d.runs)
          const drafts = d.pullRequests.filter((p) => p.draft).length
          return (
            <article className="record" key={name} data-repo={name}>
              <div>
                <span className="record__code">{name}</span>
                <div className="record__title">
                  {d.pullRequests.length} open pull requests ({drafts} draft) ·{' '}
                  {d.issues.length} open issues · {d.runs.length} runs
                </div>
                {d.pullRequests.map((p) => (
                  <div className="panel__purpose" style={{ margin: 0 }} key={`pr-${p.number}`}>
                    <Linked url={p.url}>#{p.number}</Linked> {p.title}
                    {p.draft ? ' · draft' : ''} <Stamp s={p} />
                  </div>
                ))}
                {d.issues.map((i) => (
                  <div className="panel__purpose" style={{ margin: 0 }} key={`is-${i.number}`}>
                    <Linked url={i.url}>#{i.number}</Linked> {i.title}
                    {i.labels.length ? ` · ${i.labels.join(', ')}` : ''} <Stamp s={i} />
                  </div>
                ))}
                {build === 'UNKNOWN' && (
                  <Flag tone="permanent">
                    Build status UNKNOWN until a run list with completed runs on
                    main is pasted.
                  </Flag>
                )}
              </div>
              <div className="record__meta">
                <span
                  className={`status ${
                    build === 'PASSING'
                      ? 'status--built'
                      : build === 'FAILING'
                        ? 'status--conditional'
                        : 'status--unknown'
                  }`}
                >
                  {build}
                </span>
                <button className="nav__item" onClick={() => remove(name)}>
                  Remove from desk
                </button>
              </div>
            </article>
          )
        })
      )}
    </Panel>
  )
}
