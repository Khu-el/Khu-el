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
The kernel offers no other way, on purpose, and `appendEvent` stamps the id and
the timestamp itself so a caller cannot hand the log a history that did not
happen.

> ⚠️ **Append-only is a property of the kernel's API, not of the file.** Nothing
> in `events.jsonl` is hashed, chained or signed, so an editor can still rewrite
> it and no reader would know. Whether to add a `prev_hash` chain or to treat the
> git history as the integrity record is an open question for the principal —
> finding **A** in `docs/ai-council/AUDIT_LOG.md` (`AUD-KHU-002`).

**3. Lanes do not merge.** Lane A (NTE, enterprise and technology) and Lane B
(CCRLT and House of Ransom, family estate) stay separate. A crossing requires a
declared bridge naming that exact pair and carrying an authority reference. A
bridge records a *reference*, never a merge. The same human participating in both
structures is not authority to join them.

> ⚠️ **"Declared" currently means well-formed, not registered.** There is no
> bridge registry: `assertLaneCompatible` accepts any object a caller builds
> inline whose `authority_ref` is non-empty. Findings **B** and **C** in
> `AUD-KHU-002` put that, and the question of what `UNCLASSIFIED` means at a lane
> boundary, to the principal.

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

### 🔁 The task lifecycle is code, not a convention

`packages/neterverse-kernel/src/tasks.ts` moves a task between the `tasks/`
directories under validation. **Do not move a task file by hand** — a hand move
skips the schema check and the event, and the log then describes a history that
did not happen.

```
QUEUED  ⇄  ACTIVE  →  REVIEW  →  COMPLETED
   ↘        ⇅   ↖______↙
      →  BLOCKED
```

- `COMPLETED` is **terminal**. The successor to finished work is new work.
- A task cannot reach `ACTIVE` while anything in its `blocked_by` is unfinished
  or unknown to the bus.
- A task carrying a `human_gate` reaches `COMPLETED` only with an approval whose
  `granted_by.runtime` is `HUMAN` and which carries evidence. **A runtime cannot
  grant its own gate** — that is Executive OS §10 as a code path, and it is the
  reason consensus between runtimes is not authorization.
- Each move appends its event (`TASK_CLAIMED`, `TASK_BLOCKED`,
  `TASK_REVIEW_REQUESTED`, `TASK_RELEASED`, `TASK_COMPLETED`). A **refused**
  transition appends nothing and moves nothing.
- A task file keeps its descriptive name (`tsk_0002-kernel-verification.json`)
  through every state.

Handoff packets have the same treatment — `OPEN → CLAIMED → {COMPLETED,
REJECTED}` — and a settled packet is filed to `handoffs/completed/` or
`handoffs/rejected/` so the two inboxes hold only what is actually outstanding.

---

## 🤝 Two spellings of one handoff

`docs/AI_COUNCIL.md` §7 defines a **prose** handoff and
`docs/ai-council/TEMPLATES.md` gives its full form. This bus defines a
**machine-validated** one in `schemas/handoff.schema.json`. They are not two
systems — they are one idea written for two readers, and the rule from §6 and
Executive OS §4 is *map, do not multiply*.

| AI Council §7 | Bus handoff field |
|---|---|
| OBJECTIVE | `objective` |
| CURRENT STATE | `current_state` |
| COMPLETED | `last_action`, plus `files_changed` · `commits` · `tests_run` · `test_results` |
| DECISIONS | `decisions` |
| CONSTRAINTS | `dependencies` · `risks` |
| OPEN QUESTIONS | `open_questions` |
| RECOMMENDED NEXT ACTION | `next_action` |
| BEST NEXT INTELLIGENCE | `recipient` |
| APPROVAL NEEDED | `human_gate` |

**Two gaps, left visible rather than papered over:** the Council's **STRONG
POINTS** and **OPPORTUNITIES** have no field in the bus schema. They are
judgements about a contributor's work, and the bus records machine-checkable
state — `verified_facts` is the nearest thing and is not the same thing. A
handoff that needs to credit what worked or name an opening should say so in
prose, using the Council template, and reference the packet.

**Which to use:** a packet passing between runtimes belongs on the bus, where it
is validated. A handoff a person will read belongs in the Council's prose form.
A consequential handoff can be both, and then the packet is the record of state
and the prose is the record of judgement.

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
