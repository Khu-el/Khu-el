# 🔎 AI Council Audit Log — `Khu-el/Khu-el`

> **Governed by:** `docs/AI_COUNCIL.md` §5 (review protocol) and §14.3 (audit obligation)
> **Scope:** this repository only. Audit logs are per-repository; the standard and its
> templates are synchronized across all three.

An audit is a §5 review run against work already created. Same rules: credit what works,
cite evidence for every finding, propose rather than rewrite, and never let a finding
acquire a confidence level the evidence does not support.

**🛑 An audit finding is a finding, not a mandate.** Nothing here has been acted on.
Acting on a finding is governed by §10 / Executive OS §10.

## Index

| ID | Date | Subject | Auditor | Findings | Status |
|----|------|---------|---------|----------|--------|
| `AUD-KHU-001` | 2026-09-14 | Baseline audit at adoption of the AI Council standard | Claude Code (Anthropic) | 3 | `OPEN — awaiting principal's decision` |
| `AUD-KHU-002` | 2026-09-21 | Verification of `@nte/neterverse-kernel` and its connector layer (handoff `ho_0001`) | Claude Code (Anthropic) | 10 | `PASS WITH CONDITIONS — 7 conditions cleared in code, 3 awaiting the principal` |

---

# `AUD-KHU-001` — Baseline audit

**AUDITOR:** Claude Code (Anthropic) · **DATE:** 2026-09-14
**SUBJECT:** State of `Khu-el/Khu-el` at the moment the AI Council standard was adopted
**ORIGINAL CONTRIBUTOR:** ⚪ UNKNOWN per commit metadata — prior work is attributable to
earlier Claude Code sessions by branch naming (`claude/*`) but provenance was not recorded
at the time. This is the gap §14.1 now closes going forward; it cannot be closed backwards.
**EVIDENCE BASE:** `docs/EXECUTIVE_OS.md`, `docs/scheduled-tasks/{SPEC,REGISTRY,TEMPLATE}.md`,
`packages/governance-core/src/types.ts`, `server/src/lib/email.ts`, `server/src/routes/{memo,digest}.ts`,
`git log`, repository file survey (77 TS/TSX files outside `node_modules`).

## ✅ What is working

- **🧬 The governance vocabulary is a *type*, not a convention.** `AssertionStatus`,
  `ReconciliationStatus`, `Lane`, `EvidenceRef`, and `GovernedRecord<T>`
  (`packages/governance-core/src/types.ts`) make the difference between "I typed this in"
  and "a professional confirmed this" something the compiler participates in. Most systems
  express this as a style guide and then drift. **This should not be changed** — new
  features extend this vocabulary rather than adding a parallel one. 🟢 KNOWN
- **📐 `EvidenceRef` carries `sourceSystem`, `sourceDate`, `description`, and a four-level
  classification** — Executive OS §2's *SOURCE · AS-OF · CLASSIFICATION* rule expressed as
  data rather than as prose nobody reads at write time. 🟢 KNOWN
- **📄 The controlling standard is genuinely synchronized.** `docs/EXECUTIVE_OS.md` is
  byte-identical across all three repositories (`md5 38108ebc79b47b7faa5659eff296279b`),
  verified in this session rather than assumed from the header block. The header's
  canonical-source/synchronized-copies pattern is good practice and was reused for
  `AI_COUNCIL.md`. 🟢 KNOWN
- **🗣️ CLAUDE.md states its own limits honestly** — "no test runner and no linter are
  configured … do not claim ✅ on tests pass", and it scopes that claim to the workspaces
  actually checked rather than to the repo forever (commit `f06ebe6`). Documentation that
  says what it does *not* know is rarer and more valuable than documentation that is
  merely complete. 🟢 KNOWN

## 💡 Opportunities to strengthen

| # | Finding | Evidence | Confidence | Why it matters | Proposed fix |
|---|---------|----------|------------|----------------|--------------|
| 1 | **The "no third-party send" boundary is enforced by caller convention, not by the type — but is documented as architectural.** `CLAUDE.md` and `EXECUTIVE_OS.md` §14 both state that `sendSelfEmail()` *hard-codes* `req.user.email`. It does not: it accepts a free `to: string`. | `server/src/lib/email.ts:19-23` (`SendSelfEmailInput { to: string }`), `:39` (`to: input.to`); binding happens at the call sites `server/src/routes/memo.ts:32` and `server/src/routes/digest.ts:85` | 🟢 KNOWN | **Current behavior is correct** — both call sites pass `req.user!.email`, so no third-party send is possible today. The gap is between the guarantee's *strength* and its *documentation*. A third call site added later would satisfy the type checker while silently breaking a boundary the standards describe as having "no code path". The module's own doc comment is accurate ("callers must pass the authenticated user's own account email"), so this is drift in the two standards documents, not a misunderstanding by the code's author. | Close it in code rather than in prose: have `sendSelfEmail` accept the authenticated user object and read `.email` internally, or take a branded `SelfEmailAddress` type that only the auth layer can mint. Then the documented sentence becomes literally true. Correcting the two documents instead is acceptable but strictly weaker — it lowers the guarantee to match the code rather than raising the code to match the guarantee. |
| 2 | **SPEC v2 has never been exercised.** The specification, template, and registry are complete and mutually consistent; the registry contains zero tasks. | `docs/scheduled-tasks/REGISTRY.md` (`_none yet_`), `tasks/` empty | 🟢 KNOWN (state) · 🔵 PROPOSED (recommendation) | Not a defect — infrastructure ahead of demand is the correct order. But a spec with no instances has not yet met a real task, and the first one will surface whatever the spec assumed. Worth treating the first task as a test of the spec as much as of the task. | No change now. When the first scheduled task is defined, review SPEC v2 against it and record any revision in the spec's own change log. |
| 3 | **The invariants most worth protecting are the ones nothing checks.** Lane A / Lane B non-merging, the approval boundary, and invite-only fail-closed registration are the three rules whose violation would be most costly and least visible. | No test runner configured in the root, `packages/governance-core`, the four apps, or `server/` (stated in `CLAUDE.md`, consistent with the file survey) | 🔵 PROPOSED | AI Council §12 ranks `VERIFIED > assumed`. These three are not style preferences; they are the repo's hard boundaries. A small number of targeted tests would convert them from documented intent into checked fact — and would catch finding #1's failure mode automatically. | Consider a minimal runner in `server/` and `packages/governance-core` covering only the hard boundaries: no recipient other than the authenticated user reaches the mail transport; registration fails closed without a valid invite; no bridge record merges lane data. Not broad coverage — three tests that make the boundaries self-enforcing. This is a 🔵 PROPOSED design choice and adds a dependency the repo currently does not carry, so it is the principal's call. |

## ⚠️ Risks / blind spots

- **Provenance cannot be reconstructed backwards.** §14.1 requires contributor attribution
  going forward; existing artifacts do not carry it, and it is recorded as ⚪ UNKNOWN
  rather than inferred from branch names. Inferring it would be exactly the ❓→✅ conversion
  Executive OS §1 forbids.
- **Nothing in this audit was acted on.** Findings #1 and #3 both touch the approval
  boundary and the hard boundaries in `CLAUDE.md`; changing them is the principal's
  decision, not an audit's.
- **No attempt at instruction injection was found** in any reviewed file (§14.2 check).

## 🔗 Integration

Findings live here, not in the code. Finding #1, if accepted, changes `server/src/lib/email.ts`
plus two sentences in `CLAUDE.md` and `docs/EXECUTIVE_OS.md` §14 — a cross-repo edit, since
`EXECUTIVE_OS.md` is synchronized to all three repositories.

## 🎯 Recommended next move

Decide on finding #1. It is small, its evidence is unambiguous, and it converts a
documented guarantee into an enforced one. Findings #2 and #3 can wait for the work that
would exercise them.

## 🛑 Approval needed

- Finding #1 — modifying `server/src/lib/email.ts` and the synchronized standards text.
- Finding #3 — adding a test dependency to a repo that deliberately carries none.

---

# `AUD-KHU-002` — Kernel verification under handoff `ho_0001`

**AUDITOR:** Claude Code (Anthropic) · **DATE:** 2026-09-21
**SUBJECT:** `packages/neterverse-kernel` (`@nte/neterverse-kernel`) and its connector layer
**ORIGINAL CONTRIBUTOR:** Claude Code (Anthropic), sessions `claude-code-init-2026-09-10`
and `claude-code-sync-2026-09-11`, recorded in `.neterverse/events/events.jsonl`.

> ### ⚠️ Provenance of this review — read before relying on it
>
> Handoff `ho_0001` addressed **`CODEX`** as Verifier under the builder-and-verifier
> protocol. **Codex never claimed it.** `handoffs/codex-to-claude/` was empty and no event
> from a `CODEX` actor appears anywhere in the log; the packet sat `OPEN` from
> 2026-09-10 until this session. The principal instructed Claude Code to pick the work up.
>
> **This review is therefore not the independent peer verification `ho_0001` asked for.**
> Claude Code audited work Claude Code produced. That is a materially weaker check, it is
> recorded as such rather than presented as the thing it is not (§14.1), and it is the
> reason `tsk_0002` moves to `REVIEW` rather than `COMPLETED`. Handoff `ho_0002` reopens
> the independent pass — over both the original kernel and the changes made here, which
> have had no reviewer but their author.

**EVIDENCE BASE:** every file under `packages/neterverse-kernel/src/`;
`.neterverse/schemas/*.schema.json`; `.gitignore`; `git ls-files .neterverse/`;
`npm test`, `npm run typecheck`, `npm run build`, `npm run bus -- validate|audit`; and six
executable probes run against throwaway copies of the bus. Every finding below was
**reproduced**, not reasoned to; the one exception is labelled 🟠 TENTATIVE and says why.

## ✅ What is working — and should not be changed

- **🧪 The claims in `ho_0001` were true as written.** 59 tests pass, 0 fail, on a fresh
  checkout with **no `npm install`** — Node 22.22.2 strips the types and runs them. The
  typecheck is clean and the full repository build completes. A handoff whose stated
  evidence survives re-execution is rarer than it should be. 🟢 KNOWN
- **🧱 Architecture over exhortation.** The lane firewall, the risk tiers and the
  approval boundary are *code paths that throw*, not paragraphs. AUD-KHU-001 finding #3
  asked for exactly this and the kernel delivers it for the control plane. **Preserve
  this shape.** 🟢 KNOWN
- **📵 No credentials, no sockets.** `connectors.ts` declares what each system is
  authoritative for and how fast it goes stale, and deliberately performs no I/O; an
  authorized runtime reads and hands the result to `recordObservation`. This is why the
  kernel runs on a fresh clone and why no token can leak from a public repository. 🟢 KNOWN
- **⏳ Staleness is modelled, not assumed.** `bus status` reports `0/6 fresh, 6 never
  observed` on a clean checkout rather than replaying the last good reading. A control
  plane willing to say it does not currently know is worth more than one that is
  confidently out of date. 🟢 KNOWN
- **✍️ A dependency-free validator that refuses what it does not understand** rather than
  skipping it. The instinct is right and is preserved below; finding #6 only makes the
  refusal consistent. 🟢 KNOWN

## 💡 Findings

Severity is the cost of the failure, not the size of the fix. **Reproduction** names the
probe; all six ran against copies of the real bus in a temp directory.

| # | Finding | Evidence & reproduction | Confidence | Why it matters | Disposition |
|---|---------|------------------------|------------|----------------|-------------|
| 1 | **The approval boundary was bypassed by renaming the action.** `requiresHumanApproval` tested `HUMAN_ONLY.has(action)` — exact string, case-sensitive. `send` gated; **`send_email`, `sendEmail`, `Send`, `gmail.send`, `publish_notice` did not.** | `src/risk.ts:77-79` (pre-change). Probe: all ten variants returned `false` at tier `R1`. | 🟢 KNOWN | The module's own comment says this list exists "because mis-tiering is the likeliest failure — an action labelled R1 that actually sends an email is still a send." The single most common real spelling of that action walked through. This is Executive OS §10. | ✅ **Fixed.** Token matching for distinctive verbs; ambiguous words (`file`, `sign`, `serve`…) match only as a whole action name so `read_file` and `sign_in` do not fire. 8 regression tests. |
| 2 | **An unrecognised risk tier failed open.** `RISK_ORDER.indexOf()` returns `-1`, so a tier that is not a tier compared *below* `R0`. `mayExecuteUnattended('R9','R0')` returned **`true`** — an unclassifiable action ran unattended at the lowest ceiling — and `requiresHumanApproval('wire','R9')` returned `false`. | `src/risk.ts:57-58, 87-90` (pre-change). Probe output reproduced both. | 🟢 KNOWN | Tiers arrive from JSON — task files, handoff packets, registries — so the type annotation is a claim about the caller, not a guarantee. The one input nobody classified was the one input treated as safest. | ✅ **Fixed.** `isRiskTier` guard; unknown fails closed in all three predicates. |
| 3 | **`strictestRisk` rounded an unknown tier *down*, directly contradicting its own doc comment** ("Classification never rounds down"). `strictestRisk('R9','R0')` returned `'R0'`. | `src/risk.ts:62-67` (pre-change). | 🟢 KNOWN | A comment asserting an invariant the code does not hold is worse than no comment: it is relied upon. | ✅ **Fixed.** Returns `R4` when any input is unplaceable. |
| 4 | **The committed-state audit did not scan everything git publishes.** `COMMITTED_DIRS` was a hand-kept list of seven directories. `.neterverse/evidence/` (3 files tracked), `.neterverse/locks/`, and loose files at the bus root are **published by git and were never read** — while the module's docstring claimed "It scans only what git would publish". | `src/audit.ts:26,103-107` (pre-change); `git ls-files .neterverse/evidence` returns 3 paths; `git check-ignore` confirms only `live/` is ignored. Probe: a Drive identifier placed in each of the three locations produced **zero** findings. | 🟢 KNOWN | The repository is public and `evidence/` is precisely where test results and manifests — the artifacts most likely to carry a file identifier — are meant to land. The audit was reporting a boundary it had not looked at. | ✅ **Fixed.** Scanning is now derived from what is *not* ignored, so a new committed directory is covered the moment it exists. |
| 5 | **Two realistic identifier shapes evaded the pattern rules.** (a) Google Drive and Docs identifiers routinely contain `-` and `_`; each separator ends a `\b`, chopping the token below the 25-character floor. `1XyZ-aBcDeFg-HiJkLmN-oPqRsTuV-wXyZ0123` passed clean. (b) Only file *contents* were scanned, never file *names* — `state/drive-1BxiMVs0…upms.json` passed clean. | `src/audit.ts:59-60,111` (pre-change). Probe: both undetected; 6 of 7 planted leaks undetected in total. | 🟢 KNOWN | Same public-repository exposure as #4, reached from the other direction. | ✅ **Fixed.** A segmented-identifier rule rejoins separator-split tokens and uses a case-flip count for precision; paths are scanned as line 0. Verified the real bus state still audits clean and that `ADR-0002-connecting-to-systems-of-record`, `claude-code-init-2026-09-10` and the 40-hex git SHA stay quiet. |
| 6 | **`bus validate` printed "All registries valid" while validating half the state, and a deleted registry passed.** `REGISTRY_SCHEMAS` maps 3 names; `state/` holds 6 files. `readJson`'s `{entries: []}` fallback meant a **missing** file validated as an empty pass. | `src/registries.ts:27-31,33-38` (pre-change). Probe: `agent-registry.json` deleted **and** `ecosystem-state.json` replaced with `{"entries":[{"totally":"bogus"}]}` → `validateAllRegistries` returned **0 problems**. | 🟢 KNOWN | CI runs this step. An unqualified ✅ over unverified ground is the specific failure Executive OS §1 forbids, and here it was being emitted by the tool the standard relies on. | ✅ **Fixed.** A missing mapped registry is a `FILE_MISSING` problem (except on an uninitialised bus); the CLI now prints what it checked and names what it could not. |
| 7 | **The append-only log accepted a false history at write time.** `appendEvent` took optional `event_id` and `timestamp`. A caller could date an `APPROVAL_GRANTED` to **1999** and reuse an existing event id; both were accepted and the log left out of chronological order. | `src/bus.ts:81-89` (pre-change). Probe reproduced both; no call site in `src/` or `test/` supplied either field. | 🟢 KNOWN | "A system that can quietly tidy its own history cannot be used as evidence of anything" — the module's own words. It could not tidy history afterwards, but it would write whatever history it was handed. | ✅ **Fixed.** Both are stamped at write time and are no longer accepted from callers. |
| 8 | **A lease with an unparseable expiration was immortal.** `new Date('nonsense').getTime()` is `NaN` and `NaN <= now` is `false`, so `isExpired` answered "not expired" forever. Reachable **through schema validation**, because `format: date-time` tested shape only: `2026-13-45T99:99:99Z` validated clean. | `src/leases.ts:35-37` and `src/validate.ts:35,96` (pre-change). Probe: the lease validated `true` and `isExpired` returned `false`. | 🟢 KNOWN | Expiry exists so "a runtime that dies mid-task must not be able to block the resource permanently". One malformed value inverts it and the resource is locked for good. | ✅ **Fixed.** Unparseable expiry counts as expired; `format: date-time` now requires a real instant. |
| 9 | **Two runtimes sharing an `instance_id` inherited each other's leases.** The renewal exemption compared `task_id` and `agent.instance_id` but **not `agent.runtime`**. `CODEX/worker-1` acquired a lease held by `CLAUDE_CODE/worker-1`. | `src/leases.ts:88` (pre-change). Probe reproduced it directly. | 🟢 KNOWN | `instance_id` is a free-form string with no uniqueness rule. Claude-Code-versus-Codex mutual exclusion is the entire purpose of the module. | ✅ **Fixed.** Both fields compared; renewal by the same runtime still works. |
| 10 | **Unsupported-keyword detection depended on the data, not the schema.** The check ran inside the instance walk, and sub-schemas were only visited for properties the instance carried — so a constraint on an *absent optional* property was silently skipped. | `src/validate.ts:56-60,125` (pre-change). | 🟢 KNOWN | The module's headline promise is that it never quietly skips a constraint, "because it produces unearned confidence". The same schema was strict for one record and lax for the next. | ✅ **Fixed.** The schema is walked once, independently of the instance. |

## 🧠 My contribution

- Six executable probes (throwaway bus copies, no real state touched) that reproduce
  findings 1–9 rather than asserting them.
- The ten fixes above, each with regression tests: `test/hardening.test.ts` (18 tests).
- `src/tasks.ts` — the task and handoff lifecycle `ho_0001` asked for, with
  `test/tasks.test.ts` (20 tests, majority on denied paths).
- Suite: **59 → 97 tests, 0 failures.** Typecheck clean, build clean, `bus audit` clean.

## ⚠️ Risks / blind spots

- **🔁 The verifier is the author.** Stated at the top and repeated here because it is the
  most important limitation of this document. Findings 1–10 were found by the same system
  that wrote the code they are about; a genuinely independent pass may find what a shared
  blind spot hid.
- **🔓 `appendEvent` can no longer be given a false history, but `events.jsonl` is still
  not tamper-evident.** Probe: deleting the last two lines with a text editor left
  `readEvents` perfectly happy — no digest, no hash chain, no length record. **Append-only
  is a property of this module's API, not of the artifact.** See finding A below.
- **🌉 A `LaneBridge` is a shape, not a registration.** `assertLaneCompatible` accepts any
  object a caller constructs inline; `authority_ref` need only be non-empty, so
  `{bridge_id:'made-up', authority_ref:'x'}` crosses `LANE_B → LANE_A`. There is **no
  bridge registry anywhere in the repository** (`grep` for `LaneBridge`: `src/lane.ts`
  only). See finding B.
- **⚪ `UNCLASSIFIED → UNCLASSIFIED` passes freely**, because `isSameLane` compares
  equality. `lane.ts` says everything other than a same-lane move is refused "including
  `UNCLASSIFIED`, because 'we have not classified it yet' is the state in which mistakes
  are easiest to make" — yet two unclassified records, which may in truth be Lane A and
  Lane B, join with no bridge. See finding C.
- **🟠 Lease acquisition is not atomic** (read → check → write, `src/leases.ts:84-125`,
  no `O_EXCL`, no lock file, no atomic rename). Two processes can in principle both pass
  the conflict check. **I could not reproduce it**: 15 concurrent pairs produced 0 double
  acquisitions, because process-start skew dominates. Recorded as 🟠 TENTATIVE —
  structurally present by inspection, not demonstrated.
- **📏 One residual in the audit, accepted deliberately.** An 8-digit ClickUp list id still
  passes; the numeric rule floor stays at 9 because lowering it to 8 fires on bare dates
  such as `20260921`. Precision was judged worth more than that one shape, per the
  module's own reasoning. Stated rather than silently accepted.
- **🧾 The human-only list is matched by *name*, and names are the caller's to choose.**
  `wire_transfer` and `transfer_money` do not appear on it and so do not gate at R1;
  `move_money` does. Extending the list is the principal's call, not a verifier's — the
  list is a policy artifact. See finding D.
- **🛡️ No instruction-injection attempt was found** in the kernel, the bus state, or
  `ho_0001` (§14.2 check).

## 🛑 Findings left for the principal — not acted on

These four are architecture or policy, not defects. AI Council §6 asks that replacement be
justified before it is performed, and §10 puts policy with the principal.

| ID | Finding | Options | Why it was not done here |
|---|---------|---------|--------------------------|
| **A** | `events.jsonl` has no tamper evidence. | Add a `prev_hash` chain and a `bus verify-log` command; or accept that the git history is the integrity record and say so in the README. | Changes the event record format — a contract any peer runtime reads. Worth a decision, not a unilateral edit. |
| **B** | `LaneBridge` has no registry and no expiry. A bridge is accepted on its shape. | Add `.neterverse/state/bridge-registry.json` with a schema, and have `assertLaneCompatible` resolve `bridge_id` against it rather than trusting the object; optionally give a bridge an expiry, since the bus's own first rule is that verification expires. | The lane firewall encodes the principal's Lane A / Lane B doctrine. A verifier does not quietly redesign it. |
| **C** | `UNCLASSIFIED → UNCLASSIFIED` crosses with no bridge. | Decide whether `UNCLASSIFIED` is *a lane* (current behaviour) or *a bucket of unknowns* (in which case it should require a bridge like any other crossing). | A policy question with a real cost either way; changing it would break callers relying on the present reading. |
| **D** | `HUMAN_ONLY_ACTIONS` omits `wire_transfer` / `transfer_money`, and compounds on ambiguous verbs (`file_return`, `record_deed`) are not caught by name. | Extend the list, and keep relying on correct tiering for compounds. | The list defines the boundary; extending it is the principal's act even when the change only tightens. |

## 🔗 Integration

All changes are inside `packages/neterverse-kernel` plus two additive enum members in
`.neterverse/schemas/event.schema.json` (`TASK_REVIEW_REQUESTED`, `TASK_RELEASED`) —
additive, so every existing event record stays valid. No app, the server, or
`governance-core` is touched. `bus validate` output changed shape; nothing parses it.

## 🎯 Recommended next move

Independent verification of this work by a runtime that did not write it — `ho_0002`, open
in `handoffs/claude-to-codex/`. Then decide A–D. `tsk_0002` sits in `review/`, not
`completed/`, until that pass happens.

## 🤖 Suggested handoff

**`CODEX`**, as Verifier — the role `ho_0001` created and that is still unfilled.
