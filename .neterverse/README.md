# 🧬 `.neterverse/` — the Claude Code ↔ Codex collaboration bus

Durable shared state for every authorized runtime working this ecosystem. Read
this before writing anything here.

> ## ⚠️ This repository is PUBLIC
>
> Everything committed here is world-readable. Bus state carries the
> **mechanism** and **non-identifying status** only. Never write an account
> identifier, workspace ID, file ID, calendar address, document title, customer
> name, gate detail or record content into this directory — those live in their
> private systems of record, and a reference here is a publication.
>
> Whether the control plane should stay in a public repository is an open
> question for the principal. See `decisions/ADR-0001`.

**Controlling standards:** `docs/EXECUTIVE_OS.md` (how work is researched,
evidenced and recorded) and `docs/scheduled-tasks/SPEC.md` (how a recurring task
is defined). This directory does not replace either; it makes them executable.

---

## 🚦 Start here

```bash
npm run bus -- status       # what the bus knows, including connector freshness
npm run bus -- connectors   # live connector health and staleness
npm run bus -- validate     # is bus state still valid
npm run bus -- audit        # is anything unpublishable in committed state
npm run bus -- events       # what happened, oldest last
npm run bus -- sync --file <observation.json>   # record a connector reading
```

No install is required. Node 22.6+ runs the TypeScript directly.

---

## 🗂️ Layout

| Path | Holds |
|---|---|
| `schemas/` | The contract. Every record here validates against one of these |
| `state/` | Registries: ecosystem, connectors, capabilities, agents, deployments, projects |
| `events/events.jsonl` | Append-only log. One JSON record per line |
| `live/` | **Never committed.** Connector observations, which may carry identifiers |
| `locks/active-locks.json` | Task leases in force |
| `handoffs/` | Packets between runtimes: `claude-to-codex/`, `codex-to-claude/`, `completed/`, `rejected/` |
| `tasks/` | `queued/` → `active/` → `blocked/` → `review/` → `completed/` |
| `decisions/` | Architecture decision records |
| `evidence/` | Test results, integration evidence, manifests |
| `reports/` | Generated health and status reports |

---

## 📏 The five rules

**1. Exposure is not verification, and verification expires.** A tool appearing
in a runtime listing proves nothing. An observation records a call that actually
returned, and every connector carries a freshness budget: past it, the control
plane reports the entry as **stale** rather than presenting an old reading as
current. `CATALOG` is not `PRODUCTION`, and "we checked yesterday" is not
"healthy now". A failed reading is never fresh, however recent.

**2. History is append-only.** Nothing in `events.jsonl` is edited or deleted. A
mistake is corrected by appending a `CORRECTION` that references the original.
The kernel offers no other way, on purpose.

**3. Lanes do not merge.** Lane A (NTE, enterprise and technology) and Lane B
(CCRLT and House of Ransom, family estate) stay separate. A crossing requires a
declared bridge naming that exact pair and carrying an authority reference. A
bridge records a *reference*, never a merge. The same human participating in both
structures is not authority to join them.

**4. Take a lease before you write.** Claim the resources you are about to
change. If the claim is denied, read the holder's handoff and take
non-conflicting work — never overwrite.

**5. The approval boundary holds.** R0 and R1 proceed. R2 may be prepared in full
and not released. R3 and R4 stop at the human gate. Sending, publishing, filing,
signing, transacting, moving money and changing credentials or beneficiaries stop
regardless of what tier a caller assigned them.

---

## 🤝 Working a task

```
read status  →  claim a lease  →  do the work  →  run the tests
     →  append events  →  release the lease  →  write the handoff
```

Leaving a handoff is not optional courtesy. It is how the next runtime — or the
next session of this one — resumes without re-deriving what you already learned.

---

## 🚫 What does not belong here

- **Secrets.** No key, token, password or connection string, ever. Platform
  secret managers hold those. A secret that reaches git history needs rotation,
  not deletion.
- **Copies of records that live somewhere else.** Drive, ClickUp and Notion are
  systems of record. Record that a thing exists and what state it is in; retrieve
  the source when you need it. In a public repository, even the identifier stays
  out.
- **Lane B private family records.** They stay in Lane B.
- **Claims without evidence.** If a thing was not observed, its status is ❓
  UNKNOWN and it says so. A connector never looked at reports `NEVER_OBSERVED`,
  not "healthy".

## 🔌 Connecting to a system of record

The kernel holds no credentials and opens no sockets. An authorized runtime
performs the read and hands the result to the bus:

```
runtime calls the connector  →  writes an observation JSON
      →  npm run bus -- sync --file that.json
      →  kernel validates it, stores it in live/, appends an event
      →  npm run bus -- connectors  shows freshness against the budget
```

Put counts and states in `metrics`. Put anything identifying in `detail`, which
never leaves `live/`. The committed record of a sync is the event, which carries
the summary and never the detail.
