# ADR-0001 — Control-plane foundation

> **Status:** 🔄 ACCEPTED for the kernel · ⏳ PENDING peer verification
> **Date:** 2026-09-10
> **Lane:** `LANE_A` · **Entity:** NTE · **Capacity:** Minister / Authorized Representative
> **Risk tier:** R1 — reversible internal write
> **Supersedes:** nothing

---

## 🎯 Context

Three repositories carried a written operating standard but no machine-readable
shared state. Two runtimes (Claude Code and Codex) are expected to work the same
systems, and six connectors hold live records. Nothing recorded what had actually
been verified, nothing prevented two agents writing the same resource, and
nothing distinguished *a tool exists* from *a tool answered*.

---

## 🧭 Decisions

### 1. The bus lives in `Khu-el/Khu-el`, in version control

`.neterverse/` sits in the canonical software repository rather than in Drive or
Notion. Its consumers are runtimes reading a checkout, and its contents are
diffable state, not documents. Drive stays the system of record for evidence and
issued artifacts; the bus stores **references** to Drive file IDs and never
copies their contents.

### 2. One vocabulary, not a fourth one

`packages/neterverse-kernel/src/types.ts` mirrors `Lane` and the surrounding
vocabulary from `@nte/governance-core` rather than defining its own. The account
already carries three spellings of the evidence vocabulary; a fourth would make
the mapping table in `CLAUDE.md` wrong.

### 3. The lane firewall is code, not a paragraph

`assertLaneCompatible()` throws unless the lanes match or a declared bridge names
that exact pair **and** carries an authority reference. `UNCLASSIFIED` gets no
exemption — an unclassified record is the state in which mistakes are easiest to
make, not a safe default.

### 4. The approval boundary has two independent triggers

An action stops for a human when its tier is R3 or above **or** when the action
name appears on the human-only list, whatever tier the caller assigned. The
second trigger exists because mis-tiering is the likeliest failure: an action
labelled R1 that actually sends an email is still a send.

### 5. History is append-only

`appendEvent()` has no sibling that edits or deletes. A mistaken event is
corrected by appending a `CORRECTION` that points at it. A system that can tidy
its own history cannot be used as evidence of anything.

### 6. Validation has no install step

The validator covers only the JSON Schema subset the bus actually uses, and
**reports** an unsupported keyword rather than skipping it. A validator that
silently ignores a constraint produces unearned confidence, which is worse than
no validator. Node 22 executes the TypeScript directly, so bus state is checkable
on a fresh clone before `npm install` has ever run.

### 7. Leases expire

A runtime that dies mid-task must not hold a resource forever, so every lease
carries a TTL and an expired lease is treated as released — with a
`LEASE_EXPIRED` event, so the reclaim is visible rather than silent.

### 8. This repository is public, so bus state carries no identifiers

`Khu-el/Khu-el` is a **public** repository. A first draft of the bus state carried
a calendar address, Drive file identifiers, a workspace identifier and named
commercial gate detail. All were removed before the first commit.

The rule that replaced them: **the public repository carries the mechanism and
non-identifying status; the private systems of record carry the records.** A
registry entry may say a connector answered and what it is the system of record
for. It may not say which account, which workspace, which file, or what the file
contained.

⚠️ **Open question for the principal:** whether the control plane belongs in a
public repository at all. Keeping the *mechanism* public is defensible and even
useful. Keeping *operational state* public is not, and the pressure to add
identifiers will only grow as the bus becomes more useful. A private control-plane
repository, with this one holding just the kernel, may be the better shape.

---

## ⚔️ Conflicts found and recorded, not resolved

Executive OS §4 and §8 both require surfacing conflicts rather than silently
reconciling them. Three are open:

| # | Conflict | Status |
|---|---|---|
| 1 | **Possible duplicate command centers.** Two private repositories in the account are named or described as a command center. Neither is in this session's scope. | ❓ UNKNOWN — contents not readable from here. **Review them before building any further control-plane surface.** A feature must not be rebuilt merely because it was not found |
| 2 | **Lane vocabulary.** The April 2026 lane doctrine tags content `Lane A · Lane B · Cross-Lane · Lane-Neutral`. The code has `LANE_A · LANE_B · PERSONAL · PHILANTHROPIC · UNCLASSIFIED` and no `Cross-Lane` member. | ❓ UNRESOLVED — the kernel expresses a crossing as a *declared bridge* rather than a lane value, which may be the better answer, but that is the principal's decision |
| 3 | **Lane A acting capacity.** The controlling instruction set limits the human capacity to Minister / Authorized Representative absent a separate appointment. The April doctrine also lists Trustee and Executor as typical Lane A capacities. | 🟠 The later source is current-control, so the kernel uses Minister / Authorized Representative. The divergence is recorded rather than settled by an agent |
| 4 | **Competing architecture documents.** Several overlapping governance-architecture documents from February 2026 sit in Drive with no supersession marking. | ❓ UNKNOWN which controls. Needs a human decision and a supersession pass |

*Drive identifiers and document titles are deliberately omitted — see the
classification decision below.*

**None of these is a defect in the kernel.** They are pre-existing ecosystem
conditions that the control plane now makes visible.

---

## 🚨 Open exception

**No production trigger and write path has an assigned owning automation engine.**
Section 15 of the orchestration standard requires exactly one owner per trigger
and write path. Until owners are assigned, no engine may be described as owning
any workflow, and duplicate-write risk stays open. Logged as a `POLICY_EXCEPTION`
event.

---

## ⚖️ Consequences

**Gained:** two runtimes can hand off without losing state; a claim about a
connector now carries the call that proved it; the lane firewall and the approval
boundary fail closed in code; bus state validates on a fresh clone.

**Cost:** the bus must be maintained, or it drifts from the systems it describes
and becomes confidently wrong. Every registry entry carries an `as_of` and a
verification method to make that drift visible rather than invisible.

**Reversibility:** fully reversible. The kernel and the bus are additive —
deleting `packages/neterverse-kernel/` and `.neterverse/` returns the repository
to its prior state. No existing file's behaviour was changed.

**Not done:** nothing is deployed, no connector was written to, no automation was
enabled, and no external action was taken.
