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
