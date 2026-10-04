# 🗂️ Claude Project Specification v1

**Status:** CANONICAL · **Version:** 1.1 · **Effective:** 2026-09-21 · **Owner:** Khu-el
**Supersedes:** none on record — no prior Claude Project definition exists in this or the sibling
repositories as of the effective date.

This is the standard every **Claude Project** in this account must satisfy before it is created on
`claude.ai`, and the rule set for keeping its knowledge base honest afterwards.

A Claude Project is the *project knowledge* surface that Executive OS §10 already assumes exists:

> Use available project knowledge before starting from zero: canonical documents, previous
> research, previous decisions, related artifacts, current ledgers, open tasks, prior
> conclusions. **Do not repeatedly ask for information already present and accessible** — and
> **do not silently reuse stale information** where current verification is needed.

This spec is how that sentence gets a concrete home. It does not create any new authority.

Companion files:

- `TEMPLATE.md` — copy to `projects/<PROJECT-ID>.md` and fill it in.
- `REGISTRY.md` — the index of every project defined under this spec. No orphan projects.
- `projects/` — one file per project, named by PROJECT ID.
- `../../scripts/claude-projects.mjs` — validates these files and assembles the upload bundles.

Workflow for any new project: **SEARCH → READ → REUSE → UPDATE.** Search `REGISTRY.md` and
`projects/` first. Create a new project only when no existing one covers the mission. This is the
same rule as Executive OS §4 and SPEC v2 for scheduled tasks, applied to project definitions.

---

## 🛑 What a Claude Project is not

Three things this spec deliberately does **not** do, because saying so once is cheaper than
discovering it later:

- **A project is not authorization.** Loading a project with estate documents does not authorize
  filing, recording, signing, or sending anything. Executive OS §10's approval boundary is
  unchanged and applies inside every project below. Convenient access is not consent.
- **A project is not a system of record.** Uploaded knowledge is a *copy*, and a copy goes stale
  the moment the original moves. The system of record stays wherever
  `.neterverse/state/ecosystem-state.json` says it is — GitHub for code, Drive for files and
  evidence, Notion for governance, ClickUp for action, Calendar for time, Gmail for mail. A
  project's knowledge base is a projection, exactly as a dashboard is.
- **A project is not a place to merge lanes.** See the capacity rule below. It is the single most
  important line in this file.

---

## 🧑‍💼 The capacity rule — one project, one capacity

**A Claude Project carries exactly one capacity. Do not blend capacities into a shared knowledge
base.**

This is SPEC v2's rule for scheduled tasks, and it binds harder here, because a project's
knowledge base is *ambient*: every conversation inside the project sees every document in it. A
Lane A commercial document and a Lane B estate document sharing one knowledge base is precisely
the merge that `CLAUDE.md` and Executive OS §14 forbid — and unlike a one-off prompt, it persists
and is invisible at the point of use.

| Code    | Capacity                          |
|---------|-----------------------------------|
| `PERS`  | PERSONAL                          |
| `HOPE`  | H.O.P.E. DEALERS / PRIMERICA      |
| `VZB`   | VERIZON BUSINESS                  |
| `REPR`  | REPRALLY                          |
| `DIGP`  | DIGITAL PRODUCTS                  |
| `NTE`   | LANE A — NTE                      |
| `HOR`   | HOUSE OF RANSOM / LANE B          |
| `CCRLT` | CCRLT                             |
| `MM`    | MASTERMIND                        |
| `OTHER` | OTHER VERIFIED CAPACITY (name it) |

The codes are the same ones `docs/scheduled-tasks/SPEC.md` uses, on purpose — **map, do not
multiply.** A scheduled task and a Claude Project that carry the same code are working in the same
capacity, and that correspondence is meant to be readable at a glance.

**Lane A and Lane B never auto-connect.** Where a Lane A project genuinely needs to know that a
Lane B interest exists, it carries a *reference* — the Business Interests registry pattern — never
the Lane B knowledge base.

---

## 🏷️ PROJECT ID & NAME

ID convention: `CP-<CAPACITY>-<NNN>`, where `<CAPACITY>` is a code from the table above and
`<NNN>` is a zero-padded sequence number unique within that capacity. IDs are never reused, even
after a project is archived.

The **name** is what appears on `claude.ai`. Keep it identical in both places so the registry row
and the live project are findable from each other.

---

## 📚 The source rule — what may be loaded

A project's knowledge base is assembled from a **source manifest**: an explicit table of files,
each with a reason for being there and an evidence classification. Four rules govern it.

### 1. Every source is named, never implied

List the actual path. `docs/EXECUTIVE_OS.md` is a source. "the governance docs" is not. This is
Executive OS §4's artifact-access rule: never claim to have read an artifact because its name
appeared somewhere.

### 2. Every source carries a classification

Use the `EvidenceRef` classification already defined in
`packages/governance-core/src/types.ts` — **do not invent a fifth level:**

| Class | Meaning here |
|---|---|
| `PUBLIC` | Already published or in a public repository. Loading it adds no exposure. |
| `INTERNAL` | Not secret, but not published. Lives in a private repo or a private workspace. |
| `CONFIDENTIAL` | Lane B, personal, or commercially sensitive. One capacity only, never a shared project. |
| `RESTRICTED` | Would need a named authorization to move at all. **Default answer is: do not upload.** |

### 3. Secrets are never sources

No `.env` carrying real values, no key material, no token, no `server/data/`, no
`.neterverse/live/`, no `package-lock.json`. The first four are boundaries this account already
enforces; the last is just noise that crowds out signal. `npm run projects -- --check` refuses a
manifest that lists any of them.

`.env.example` is the one deliberate exception and is allowed: it is committed, it holds no
values, and naming which secrets exist is genuinely useful knowledge. A file that records the
*shape* of a secret is not a secret.

### 4. A fact with a canonical home is cited, never copied

If something is already recorded authoritatively somewhere — which workspaces have tests, which
hostname serves which property, what a connector may not do — a project's instructions **name that
source and say to read it.** They do not restate the fact.

This is Executive OS §4 applied to instructions rather than to artifacts, and it was learned the
expensive way: the first version of `CP-NTE-002` quoted a test count, and that count was wrong
within a day, twice. A restated fact has no way to know it has gone stale, and the copy inside a
knowledge base is read *more* confidently than the original precisely because it is close to
hand.

So: **"read the test table in `CLAUDE.md`"** ages well. **"there are 182 tests"** does not. Where
a number genuinely must appear — a classification, a project ID — it belongs to this file and has
no other home, which is what makes it safe.

### 5. Freshness is stated, not assumed

Every manifest records when the bundle was last built. An uploaded copy is
`CURRENT_INTERNAL_MODEL` as of that date and nothing stronger — a file in a project knowledge base
is **not** evidence that the repository still says the same thing. Where a conclusion turns on the
current text, re-read the source. Rebuild after any material change to a listed source.

---

## 🧾 CUSTOM INSTRUCTIONS

Every project file carries the exact text to paste into the project's instructions field. Three
requirements:

- **Name the controlling standards** and say the stricter reading wins where they disagree, with a
  task-specific instruction from the principal overriding both.
- **State the capacity and the lane**, and state what the project must refuse to pull in.
- **Restate the approval boundary** in the terms that actually apply to that project. The generic
  boundary is in Executive OS §10; the project's instructions name the specific actions that would
  cross it *here* — because that is the form a person can act on.

Instructions are drafted in the repository, reviewed as a diff, and pasted into `claude.ai` by a
human. Keeping them in the repo is what makes them reviewable, attributable and durable; keeping
them *only* on `claude.ai` is what they were before this spec.

---

## ➕ Adding a project properly

1. **Search `REGISTRY.md` and `projects/` first.** Extend an existing project rather than adding a
   parallel one (§4). Two projects in the same capacity with overlapping sources is the
   duplication AI Council §6 exists to prevent.
2. **Copy `TEMPLATE.md`** to `projects/<PROJECT-ID>.md` and fill every section.
3. **Pick one capacity** and say why it is that one and not an adjacent one.
4. **Build the manifest** — path, reason, classification, per source.
5. **Run `npm run projects -- --check`.** It fails on a missing source, a banned source, a
   registry row without a file, or a file without a row.
6. **Add the row to `REGISTRY.md`**, then create the project on `claude.ai` and record its URL.
7. **Say what changed in the commit**, and record provenance per AI Council §14.1.

---

## 🔄 Keeping a project from rotting

A stale knowledge base is worse than an empty one, because it answers confidently from a version
of the truth that no longer exists.

| Trigger | Action |
|---|---|
| A listed source changes materially | Rebuild that project's bundle and re-upload |
| A controlling standard changes | Rebuild **every** project — all of them list the standards |
| A project's mission ends | Mark `ARCHIVED` in the registry; keep the row so the ID is never reused |
| A capacity turns out to be wrong | Move the project, do not blend. A new ID, and the old row marked `REPLACED` |
| A source turns out to be `RESTRICTED` | Remove it from the manifest, rebuild, and say so in the commit |

Status values, matching the scheduled-task registry: `DRAFT` · `ACTIVE` · `PAUSED` · `MERGED` ·
`REPLACED` · `ARCHIVED`.

---

## 📝 Change log

| ARTIFACT | VERSION | DATE | WHAT CHANGED | WHY | SOURCE | DECISION AFFECTED | NEXT REVIEW |
|---|---|---|---|---|---|---|---|
| `docs/claude-projects/SPEC.md` | 1.1 | 2026-09-21 | Added source rule 4 — a fact with a canonical home is cited, never copied | `CP-NTE-002`'s instructions quoted a test count that went stale twice in one day as suites landed. A restated fact cannot know it is stale, and a copy inside a knowledge base is trusted more than the original because it is closer to hand | Two observed drifts against `CLAUDE.md`'s test table, and `SOURCE_CONFLICTS.md` SC-04 recording the same class of drift | Whether a project's instructions may restate a fact recorded elsewhere | When a project's instructions are next found to have drifted from a canonical source |
| `docs/claude-projects/SPEC.md` | 1.0 | 2026-09-21 | Initial codification of the Claude Project standard | Project knowledge was assumed by Executive OS §10 but had no definition, no registry and no rule about what may be loaded into it — so every project's knowledge base was an undocumented, unreviewable judgment call | Executive OS §10 (project knowledge and the approval boundary); SPEC v2's capacity and SEARCH → READ → REUSE → UPDATE rules | What may be loaded into a Claude Project, and under which capacity | On the next material change to the capacity table, the classification levels, or Executive OS §10 |
