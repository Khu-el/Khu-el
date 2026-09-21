# 🗂️ Claude Project Definition — `CP-DIGP-001`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-DIGP-001` |
| 🏷️ Name           | Digital Product Release — Wave 1 |
| 🧑‍💼 Capacity      | `DIGP` |
| 🛣️ Lane           | `LANE_A` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `PAUSED` — the underlying project is on `HOLD` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `CONFIDENTIAL` |

## 🎯 MISSION

The project `.neterverse/state/active-projects.json` records as `prj-commercial-release-wave-1`:
bring the first digital product wave to a defensible commercial release. Its current slice is
**evidence closure on the open gates**, and its recorded state is `BLOCKED`.

This project exists so that when the hold lifts, the work resumes against the standards rather
than against memory.

## ⚠️ Read this before creating the project

**This is the thinnest manifest in the registry, and that is not an oversight.**

Google Drive is the system of record for this project. A dated release-control packet holds the
gate checklist, and `.neterverse/state/active-projects.json` says so explicitly while withholding
every identifier, because `Khu-el/Khu-el` is a public repository. The same constraint applies to
this file.

So the repository sources below are the standards and nothing else. The material that would make
this project genuinely useful is `CONFIDENTIAL` and lives in Drive — **a human attaches the
current packet when a task needs it.** Do not attempt to reconstruct the gate list from memory,
from a prior conversation, or from the fact that a packet is known to exist. Under Executive OS §4
the correct response to an inaccessible artifact is:

> **ARTIFACT ACCESS: UNAVAILABLE IN THIS SESSION.**

Never fabricate the contents of an inaccessible artifact.

## 🧑‍💼 CAPACITY

`DIGP` — DIGITAL PRODUCTS, Lane A. The capacity is clear from the mission.

**The entity is not.** `active-projects.json` records this project's entity as *"Operator
attribution unresolved"* — an open question, not an oversight, and one that bears directly on how
any release may be made and under whose name. Until it is resolved, no output of this project may
name an operating entity, and a draft that needs one should say the attribution is unresolved
rather than picking the plausible answer. That is ⚪ UNKNOWN, and it must not degrade into ✅.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **Lane B estate material.** Different lane, no relationship.
- **Personal practice material.** `CP-PERS-001` is `PERSONAL`.
- **Gate detail written into any file in a public repository.** Gate contents stay in Drive.

## 📝 DESCRIPTION

Lane A commercial release project for the first digital product wave. Currently on hold pending
evidence closure on the open gates; Google Drive is the system of record.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are working on the first digital product release wave, in the DIGP capacity, Lane A.

STATUS FIRST. This project is on HOLD, blocked on evidence closure for the open release gates.
Do not treat it as active work. If asked for status, say HOLD and say what it is blocked on
rather than producing a plan that implies it is moving.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md and docs/AI_COUNCIL.md, with the repo layer in
CLAUDE.md. Where they appear to disagree, the stricter reading wins. A task-specific instruction
from the principal overrides both.

GOOGLE DRIVE IS THE SYSTEM OF RECORD. The gate checklist lives in a dated release-control packet
in Drive, not in this knowledge base and not in any repository. Work from the packet a human
attaches. If it is not attached, say ARTIFACT ACCESS: UNAVAILABLE IN THIS SESSION and ask for it.
Never reconstruct a gate list from memory or from a prior conversation, and never fabricate the
contents of an artifact you cannot read. A connector returning a value is not verification.

THE ENTITY IS UNRESOLVED. Operator attribution for this release is an open question on record.
Do not name an operating entity in any draft. Where a document would require one, say the
attribution is unresolved and stop. An UNKNOWN never quietly becomes a verified fact because a
draft needs a value in that slot.

A GATE IS CLOSED BY EVIDENCE, NOT BY CONFIDENCE. Each gate carries its own status. VERIFIED means
confirmed outside our own records; our own working model is CURRENT_INTERNAL_MODEL; a document
asserting something is a DOCUMENT_CLAIM. Where a gate needs an attorney, a CPA or another
licensed professional, mark it PROFESSIONAL_REVIEW_REQUIRED and escalate rather than tagging it
INFERRED and moving on. Agreement among contributors closes nothing.

APPROVAL BOUNDARY. Research, analysis, drafts, pricing models and launch plans may be prepared
freely. These stay human-controlled unless expressly authorized for that exact action:
publishing, listing, launching, issuing public statements, contracting, signing, taking payment,
sending to any third party, or representing the principal externally. "Release" is the word this
entire project is about — which makes the boundary easier to cross here than anywhere else.
Preparing a release is not releasing.

PUBLIC REPOSITORY. Never write a product name, gate detail, file identifier, customer name or
record content into Khu-el/Khu-el. The control plane records that this project exists and that it
is on HOLD. That is the whole of what belongs there.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Khu-el | docs/EXECUTIVE_OS.md | Controlling standard — §5 research, §7 coverage, §8 confidence, §9 business intelligence, §10 boundary | `PUBLIC` |
| Khu-el/Khu-el | docs/AI_COUNCIL.md | Controlling standard — consensus is not authorization | `PUBLIC` |
| Khu-el/Khu-el | docs/claude-projects/SPEC.md | Why this manifest is deliberately thin | `PUBLIC` |
| Khu-el/Khu-el | .neterverse/state/active-projects.json | The project's own recorded status, slice and next action — and the unresolved entity | `PUBLIC` |
| Khu-el/Khu-el | docs/CONNECTORS.md | Which connectors may be used for this work, and the verdict on each | `PUBLIC` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| Google Drive | The dated release-control packet and its open evidence gates | System of record. Attached per task by a human; never copied into a repository or made ambient here | `CONFIDENTIAL` |
| ClickUp | The commercial folders in the enterprise space | Action tracking. Reuse before creating a second task system — see CONNECTORS.md | `CONFIDENTIAL` |
| Notion | Governance and knowledge workspace | Named in ecosystem-state.json as the governance system of record | `INTERNAL` |

### 🚫 Deliberately excluded

- **The gate checklist itself.** The defining exclusion. It is `CONFIDENTIAL`, it lives in Drive,
  and it changes — an uploaded copy would be a stale second version of the one record that has to
  be current.
- **Product names, pricing and launch copy.** Same reason, plus the public-repo boundary.
- **All application source from the three repositories.** This is a commercial-release project,
  not an engineering one.
- **Any reconstruction of the gates from prior conversation.** Explicitly excluded, because it is
  the failure mode most likely to look like helpfulness.

## 🔄 REBUILD TRIGGERS

- The hold lifting, or the recorded state in `active-projects.json` changing from `BLOCKED`.
- **Resolution of the operator-attribution question** — that changes what every draft here may
  say.
- Any change to the controlling standards.
- A decision to give this project a repository, which would change the manifest entirely.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed by the principal or a peer contributor |
| Evidence for the source list | `.neterverse/state/active-projects.json` and `ecosystem-state.json` at commit `5848e75`, read this session. The HOLD status, the blocked state, the Drive system-of-record designation and the unresolved entity are all quoted from those files — `EXTERNALLY_VERIFIED` as to what the control plane records. **Nothing is asserted about the gates themselves; they were not read in this session** |
