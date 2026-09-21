# 🗂️ Claude Project Definition — `CP-PERS-001`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-PERS-001` |
| 🏷️ Name           | The Mental Performance Playbook |
| 🧑‍💼 Capacity      | `PERS` |
| 🛣️ Lane           | `PERSONAL` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `DRAFT` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `CONFIDENTIAL` |

## 🎯 MISSION

Maintain **Mental Alchemy** — the personal operating system built as a working app rather than a
static document: a 90-day activation sprint, a daily discipline architecture with a binary daily
score, and a 24-month horizon roadmap.

Work here is part engineering and part content stewardship. `src/data.ts` is the canonical
playbook text — the numerology, astrology, diagnosis, rules, anchors and horizons are **personal
source material, not filler to be rewritten for tone**. A project that does not know that will
"improve" the copy and quietly destroy it.

## 🧑‍💼 CAPACITY

`PERS` — PERSONAL. Unambiguous, and the only capacity in the table that fits: this is the
principal's own practice, in a repository `ecosystem-state.json` records as **private**, holding
what `CLAUDE.md` calls the most personal data in the account. Not `MM`, which is a mastermind
context, and emphatically not `NTE` or any Lane B code.

Classified `CONFIDENTIAL` rather than `INTERNAL` because streak history and daily discipline
records are personal practice data, and because the repository itself is private.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **Any Lane A commercial or Lane B estate material.** This is `PERSONAL`. It is the one capacity
  in the account with no business relationship to any other, and it should stay that way.
- **The governance apps' source.** Mental Alchemy set the Vite + React + TypeScript + Tailwind
  pattern the NTE apps follow, which makes the stacks worth keeping aligned — it does not make the
  NTE apps part of this project.
- **Actual streak, log or checklist data.** It lives in the browser's `localStorage`, it is never
  sent anywhere, and it does not belong in a knowledge base either. That is the whole point of the
  data boundary.

## 📝 DESCRIPTION

Personal operating system: a 90-day activation sprint, daily discipline architecture and 24-month
horizon roadmap, built as an offline-only React app whose entire state lives in browser
localStorage.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are working on Mental Alchemy — The Mental Performance Playbook — in the PERSONAL capacity.
Treat this material as CONFIDENTIAL. The repository is private.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md and docs/AI_COUNCIL.md, with the repo layer in
CLAUDE.md. Where they appear to disagree, the stricter reading wins. A task-specific instruction
from the principal overrides both.

THE DATA BOUNDARY IS THE FIRST RULE. All progress lives in the browser's localStorage. Nothing
is sent to a server and there is no account system. That is a feature, not a gap. Do not add
analytics, telemetry, error reporting, a backend, or any network call without an explicit
instruction. There is currently no fetch in the app; keep it that way — no fetch,
XMLHttpRequest, sendBeacon, WebSocket, EventSource, HTTP client or analytics import in src/.
If sync is ever actually wanted, the invite-only self-email-only backend in Khu-el/Khu-el is the
ecosystem-consistent answer rather than a new standalone service.

NEVER RENAME A STORAGE KEY IN PLACE. Changing a localStorage key shape silently destroys
someone's streak history while leaving the app working — it is the one change that does damage
without an error. Version or migrate keys, and declare the change in scripts/storage-keys.json,
which is what check:keys compares against.

THE BINARY DAILY SCORE IS BINARY. Done or Not Done. No partial credit, no "almost," and no
streak that survives a missed day. An unearned check mark makes the whole instrument worthless.
Streaks and progress bars are computed from recorded state, never estimated and never
back-filled. No amount of encouragement turns a missed day into a completed one — uplift never
upgrades a status, and the score answers to recorded state, never to consensus.

THE CONTENT IS SOURCE MATERIAL, NOT DRAFT COPY. src/data.ts is the canonical content artifact.
Edit playbook copy there rather than hard-coding strings into components. Preserve prior wording
of rules and anchors unless a change is actually intended. The numerology, astrology and
diagnosis sections are personal source material — do not rewrite them for tone, do not
"professionalize" them, and do not summarize them away.

VISUALS. Where a trend across time would say more than a number — streak history, sprint-phase
completion, checklist coverage by day — use a line chart for progress over time and a heatmap for
daily habit coverage, and only where the data actually exist. If they do not, say
VISUAL OMITTED — VERIFIED DATA INSUFFICIENT rather than rendering an empty or invented chart.

NOT ADVICE. This is personal practice, not medical, psychological or financial advice. Do not
add claims of clinical outcome.

VERIFICATION. npm run check is what CI runs: typecheck, check:network, check:keys. Note that
npm run build does NOT typecheck — esbuild strips types without checking them, so a type error
ships silently unless typecheck runs. There is still no test runner and no linter. check:network
and check:keys are BOUNDARY GUARDS, not tests: do not report "tests pass" on the strength of
them. State what you actually ran. check:network scans app source only — a dependency that
phones home on its own is not covered by it.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Mental-Alchemy | CLAUDE.md | Repo layer — the data boundary, the binary score rule, the content conventions | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | README.md | What the app is and how it runs | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | docs/EXECUTIVE_OS.md | Controlling standard — §1 evidence and §2 visuals are the product itself here | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | docs/AI_COUNCIL.md | Controlling standard — uplift never upgrades a status | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | docs/ai-council/AUDIT_LOG.md | Prior audits of this repo's own work | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | src/data.ts | The canonical playbook content artifact — sprint phases, rules, horizons, anchors | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | src/App.tsx | Tab shell and app state | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | src/useLocalStorage.ts | The single persistence primitive | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | src/components/ | DailyTracker, SprintPhase, ChecklistGroup and the shared primitives | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | scripts/storage-keys.json | The declared key set — changing it is how a migration is declared | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | scripts/check-no-network.mjs | The network boundary, enforced rather than remembered | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | scripts/check-storage-keys.mjs | The key guard that protects streak history | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | package.json | The check scripts, and the fact that build does not typecheck | `CONFIDENTIAL` |
| Khu-el/Mental-Alchemy | .github/workflows/verify.yml | What CI enforces | `CONFIDENTIAL` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| The running app in the browser | Streak history, daily log, checklist state | The only place this data exists. Never synced, never uploaded, and deliberately not copied into this knowledge base | `CONFIDENTIAL` |

### 🚫 Deliberately excluded

- **The user's actual `localStorage` contents.** Excluding them is the data boundary holding. A
  knowledge base is a copy that leaves the browser, which is precisely what this app is built not
  to do.
- **`package-lock.json`, `node_modules/`, `dist/`** — no content value.
- **Anything from the other two repositories except by reference.** The stack alignment note in
  `CLAUDE.md` is a cross-reference, not an invitation to load the NTE apps here.
- **Tailwind, PostCSS and Vite config** — real files, but not what questions here turn on.

## 🔄 REBUILD TRIGGERS

- Any change to `src/data.ts` — the canonical content artifact, and the highest-value trigger.
- Any change to `src/components/` or `src/useLocalStorage.ts`.
- **Any change to `scripts/storage-keys.json`** — that means a key migration was declared, which
  is the most consequential change this app can undergo.
- Any change to the controlling standards or `CLAUDE.md`.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed by the principal or a peer contributor |
| Evidence for the source list | Direct file listing and read of `Khu-el/Mental-Alchemy` at commit `be47cfd`, this session. `EXTERNALLY_VERIFIED` as to what the repository contains. The `PRIVATE` visibility is recorded in `.neterverse/state/ecosystem-state.json` and is `CURRENT_INTERNAL_MODEL` — it was not re-checked against GitHub in this session |
