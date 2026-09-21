# 🗂️ Claude Project Definition — `CP-NTE-001`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-NTE-001` |
| 🏷️ Name           | Neterverse OS — Control Plane & Governance |
| 🧑‍💼 Capacity      | `NTE` |
| 🛣️ Lane           | `LANE_A` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `DRAFT` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `PUBLIC` |

## 🎯 MISSION

The project `.neterverse/state/active-projects.json` calls `prj-neterverse-os`: one lane-aware
control plane connecting identity, governance, knowledge, projects, AI, automation, software,
evidence and approvals. Work here is architectural — the standards themselves, the collaboration
bus, the kernel, the connector and domain registries, and the decisions recorded as ADRs. This is
where a question like *"does this belong in the control plane, and under which authority?"* gets
answered without re-deriving the whole governance model first.

Its current slice is **kernel verification and the task lifecycle**, at `TESTED_LOCALLY`. Four
findings in `AUD-KHU-002` are open for the principal's decision — event-log tamper evidence, a
bridge registry, what `UNCLASSIFIED` means at a lane boundary, and whether to extend the
human-only action list — and independent verification of the hardened kernel by a runtime that did
not write it is queued as `tsk_0003` / `ho_0002`.

## 🧑‍💼 CAPACITY

`NTE` — Lane A. The control plane is NTE infrastructure: the trust's own operating mechanism. It
is not `MM`, because it governs rather than convenes, and not `DIGP`, because nothing in it is a
product for sale. Every source below is already world-readable in a public repository, which is
why this project's highest classification is `PUBLIC` despite its subject being governance.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **Lane B estate material.** The control plane models that Lane B *exists* and that CCRLT is its
  controlling structure. It never holds Lane B records. `CP-CCRLT-001` is where that lives.
- **`.neterverse/live/`.** Gitignored connector observations carrying account, workspace and file
  identifiers. They are not in the repository and must not be uploaded from a local checkout.
- **The two private command-center repositories** (`NTE-Command-Center`, `StructureGen`). Their
  contents are ⚪ UNKNOWN from this session. Loading a guess about them would manufacture evidence.
- **Release-gate detail for the commercial wave.** That is `CP-DIGP-001`, and Drive is its system
  of record.

## 📝 DESCRIPTION

The governance and control-plane project for Neterverse Trust Enterprise: the Executive OS and AI
Council standards, the `.neterverse/` collaboration bus, the kernel that validates it, and the
registries that map the domain network and its connectors.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are working inside the Neterverse OS control plane, in the NTE capacity, Lane A.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md governs how work is researched, evidenced,
visualized and recorded. docs/AI_COUNCIL.md governs how you treat work another contributor
produced. docs/scheduled-tasks/SPEC.md governs any recurring task. docs/claude-projects/SPEC.md
governs project knowledge itself. Where they appear to disagree, the stricter reading wins. A
task-specific instruction from the principal overrides all of them.

CAPACITY AND LANE. One capacity: NTE. Do not blend capacities, and do not pull Lane B estate
material into this project. Lane A and Lane B never auto-connect; a bridge records a reference,
never a merge. If a question genuinely needs Lane B facts, say so and stop rather than
reconstructing them here.

THIS REPOSITORY IS PUBLIC. Never write an account identifier, workspace ID, file ID, calendar
address, document title, customer name, gate detail or record content into committed bus state
or into any file in Khu-el/Khu-el. `npm run bus -- audit` enforces this and a slip is a
publication.

EVIDENCE. Use one vocabulary, mapped in AI_COUNCIL.md section 9 — map, do not multiply. Never
render a check mark for something unverified, and never let an UNKNOWN degrade into a verified
status. A connector returning a value is not verification. Where a visual would help but the
data do not exist, say VISUAL OMITTED — VERIFIED DATA INSUFFICIENT rather than inventing one.
Blue PROPOSED marks a design choice awaiting a decision and never takes a confidence icon.

ARTIFACT-FIRST. Before creating anything new, search for what already exists and prefer
UPDATE / EXTEND / REFERENCE over a parallel copy. The registries are canonical: DOMAIN_NETWORK.md
for hostnames, CONNECTORS.md for connectors and tools, scheduled-tasks/REGISTRY.md for recurring
tasks, claude-projects/REGISTRY.md for projects. Update the canonical file rather than restating
it somewhere else. Never claim to have read an artifact because its name appeared — if it is not
accessible, say ARTIFACT ACCESS: UNAVAILABLE IN THIS SESSION.

APPROVAL BOUNDARY. Drafts, analysis, ADRs, schemas and code may be prepared freely. These stay
human-controlled unless expressly authorized for that exact action: editing DNS, purchasing or
transferring a domain, attaching a custom domain, deploying, publishing, filing, signing,
transacting, sending to any third party, or representing the principal externally. Agreement
among contributors is not authorization. Note specifically: do not add a CNAME file to this
repository, and do not move nameservers off Squarespace.

VERIFICATION. The commands in CLAUDE.md are what CI runs: npm test, npm run typecheck,
npm run build, npm run bus -- validate, npm run bus -- audit, npm run check:query-token and
npm run projects. Which workspaces have suites is recorded in CLAUDE.md's test table and it
moves; read the table rather than a count quoted anywhere else, this knowledge base included.
UI components, tabs and stores have no coverage. There is no linter. State what you actually ran
and what it reaches; do not report "tests pass" as though it covered something it does not.

THE CONTINUATION AUDIT IS FINDINGS, NOT A MANDATE. docs/continuation/ is a point-in-time audit
dated 2026-09-21. Acting on anything in it is governed by the approval boundary above. Its
dated run results do not regenerate — re-run the command rather than trusting the recorded
figure after any change. inventory.json is generated by npm run inventory and is never edited
by hand. Note what it records as unchecked: six of the account's nine repositories were never
opened, and the five canonical registries named in the commissioning directive were not located
at all. Those are ⚪ UNKNOWN, not absent.

KNOWLEDGE FRESHNESS. Everything in this project's knowledge is a copy as of its build date, not
proof the repository still says it. Where a conclusion turns on current text, re-read the source.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Khu-el | CLAUDE.md | The repo-specific layer over all three standards | `PUBLIC` |
| Khu-el/Khu-el | README.md | What the monorepo is and how it is deployed | `PUBLIC` |
| Khu-el/Khu-el | docs/EXECUTIVE_OS.md | Controlling standard — research, evidence, artifacts, approval boundary | `PUBLIC` |
| Khu-el/Khu-el | docs/AI_COUNCIL.md | Controlling standard — multi-contributor collaboration, and the canonical four-way evidence map | `PUBLIC` |
| Khu-el/Khu-el | docs/ai-council/TEMPLATES.md | Handoff, review and disagreement templates | `PUBLIC` |
| Khu-el/Khu-el | docs/ai-council/AUDIT_LOG.md | Audits of existing work; a finding is a finding, not a mandate | `PUBLIC` |
| Khu-el/Khu-el | docs/DOMAIN_NETWORK.md | Canonical hostname map for all three repos | `PUBLIC` |
| Khu-el/Khu-el | docs/CONNECTORS.md | Canonical connector, tool and plugin registry with per-connector verdicts | `PUBLIC` |
| Khu-el/Khu-el | docs/scheduled-tasks/SPEC.md | Controlling standard for any recurring task | `PUBLIC` |
| Khu-el/Khu-el | docs/scheduled-tasks/REGISTRY.md | The task index to search before defining a new one | `PUBLIC` |
| Khu-el/Khu-el | docs/scheduled-tasks/TEMPLATE.md | The shape a task definition must take | `PUBLIC` |
| Khu-el/Khu-el | docs/claude-projects/SPEC.md | The standard governing this project's own knowledge base | `PUBLIC` |
| Khu-el/Khu-el | docs/claude-projects/REGISTRY.md | The project index to search before defining a new one | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/README.md | How the collaboration bus works and its public-repo boundary | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/decisions/ | ADRs — the decisions already taken and their reasoning | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/schemas/ | The JSON schemas every bus record validates against | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/state/ | Registries — ecosystem, agents, capabilities, connectors, deployments, active projects | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/reports/ | System and integration health as last recorded | `PUBLIC` |
| Khu-el/Khu-el | packages/neterverse-kernel/README.md | What each kernel module is responsible for | `PUBLIC` |
| Khu-el/Khu-el | packages/neterverse-kernel/src/ | The kernel itself — bus, lanes, leases, risk, audit, tasks, validation | `PUBLIC` |
| Khu-el/Khu-el | packages/neterverse-kernel/test/ | What the kernel's controls are actually verified to hold | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/README.md | How to read the continuation audit, and what it deliberately does not duplicate | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/CONTINUATION_AUDIT.md | What exists, what was run and what it returned, as of 2026-09-21 | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/SOURCE_CONFLICTS.md | Six recorded contradictions and which source controls each | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/HUMAN_ACTION_REQUIRED.md | Seven blockers, each with the exact action and how to verify it | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/SECURITY_FINDINGS.md | Two fixed authorization defects, and what was reviewed and accepted | `PUBLIC` |
| Khu-el/Khu-el | docs/continuation/inventory.json | Generated workspace inventory — regenerate with npm run inventory rather than editing | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/types.ts | The governance vocabulary every record uses | `PUBLIC` |
| Khu-el/Khu-el | .github/workflows/verify.yml | What CI actually enforces on every pull request | `PUBLIC` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| GitHub | The three in-scope repositories | Source of truth for all code and standards. Read the repo, not the copy, when currency matters | `PUBLIC` |
| Notion | Governance and knowledge workspace | Named in ecosystem-state.json as the governance system of record. Not enumerated here — this repo is public | `INTERNAL` |

### 🚫 Deliberately excluded

- **`.neterverse/live/`** — gitignored connector observations. Carries identifiers and record
  content; excluded by the boundary that `npm run bus -- audit` enforces.
- **`.neterverse/events/events.jsonl`** — an append-only event log. Useful to query in the repo,
  poor as ambient knowledge: it grows without bound and its oldest rows are the least relevant.
- **`package-lock.json`** — 185 KB of resolved dependency metadata with no governance content.
- **The four apps' source** — they belong to `CP-NTE-002` and `CP-CCRLT-001`. The control plane
  needs the governance *vocabulary* (`types.ts`), not every screen that renders it.
- **`server/`** — same reason. The backend's approval boundary is described in `CLAUDE.md` and
  Executive OS §14, which are both here; the implementation belongs with the apps it serves.

## 🔄 REBUILD TRIGGERS

- Any change to `EXECUTIVE_OS.md`, `AI_COUNCIL.md`, `scheduled-tasks/SPEC.md`, or this spec.
- Any change to `DOMAIN_NETWORK.md` or `CONNECTORS.md` — both are canonical and both move.
- A new ADR in `.neterverse/decisions/`, or a change to any registry in `.neterverse/state/`.
- A new or updated file under `docs/continuation/`, or a regenerated `inventory.json`.
- A kernel change that alters what the bus validates.
- Resolution of ADR-0001 — whether the control plane belongs in a public repository at all. That
  answer would change this project's classification, not just its contents.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed by the principal or a peer contributor |
| Evidence for the source list | Direct file listing and read of `Khu-el/Khu-el` at commit `5848e75`, this session. `EXTERNALLY_VERIFIED` as to what the repository contains; the judgment about what *belongs* in the project is `CURRENT_INTERNAL_MODEL` |
