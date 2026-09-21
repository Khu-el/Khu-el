# 🚀 Creating these projects on claude.ai

Six project definitions live in `projects/`. **None of them exists on `claude.ai` yet** — every
registry row reads `DRAFT`, and creating a project is a human act.

This file is the runbook for turning a definition into a live project. It takes about ten minutes
per project, most of which is waiting for uploads.

---

## 🛠️ Step 1 — build the bundles

From the repo root:

```bash
npm run projects            # validate the definitions and the registry
npm run projects:build      # assemble every bundle into build/claude-projects/
```

`build/claude-projects/` is gitignored. Each project gets a folder containing:

| File | What it is |
|---|---|
| `00-INSTRUCTIONS.md` | The custom instructions to paste into the project |
| `00-MANIFEST.md` | What is in the bundle, each source's classification, and the build time |
| `Khu-el__Khu-el/…` | The source files themselves, under the repo they came from |

To build one project only:

```bash
npm run projects:build -- CP-NTE-001
```

### If a repo is not checked out

`CP-NTE-003` needs `Khu-el/Neterverse_DAO` and `CP-PERS-001` needs `Khu-el/Mental-Alchemy`. The
script looks for them **as siblings of this repo** by default. Point it elsewhere with:

```bash
NETERVERSE_DAO_ROOT=/path/to/Neterverse_DAO \
MENTAL_ALCHEMY_ROOT=/path/to/Mental-Alchemy \
npm run projects:build
```

A missing repo is not an error — the bundle builds without those files and
`00-MANIFEST.md` lists what was left out, so an incomplete upload is visible rather than silent.

---

## 🗂️ Step 2 — create each project

On `claude.ai`, for each row in `REGISTRY.md`:

1. **New project.** Name it **exactly** as the registry row names it. The registry is how a
   definition and a live project find each other; a renamed project is an orphan.
2. **Description** — paste the `📝 DESCRIPTION` section from the definition file.
3. **Instructions** — paste the contents of `00-INSTRUCTIONS.md`, without the surrounding fence.
4. **Knowledge** — upload the contents of the bundle folder. Include `00-MANIFEST.md`: it tells
   any future conversation what it is looking at and, more importantly, **when it was built**.
5. Copy the project URL back into `REGISTRY.md` and move its status from `DRAFT` to `ACTIVE`.

Run `npm run projects` after editing the registry — it will catch a status or name that drifted
from its definition.

---

## 🧭 Suggested order

Not required, but this order front-loads the projects that make the others easier to reason about:

| # | Project | Why this order |
|---|---|---|
| 1 | `CP-NTE-001` Control Plane | Holds the standards themselves. Everything else references them |
| 2 | `CP-NTE-002` Lane A Apps | The largest body of day-to-day work |
| 3 | `CP-PERS-001` Mental Performance Playbook | Self-contained, and the easiest to verify you got the pattern right |
| 4 | `CP-NTE-003` DAO Portal | Needs the DAO repo checked out |
| 5 | `CP-CCRLT-001` Legacy & Estate | **Settle the capacity question first** — see below |
| 6 | `CP-DIGP-001` Release Wave 1 | On `HOLD`. Create it when the hold lifts, or now as a placeholder |

---

## ⚠️ Two things to decide before you start

### 🔵 `CP-CCRLT-001`'s capacity is PROPOSED, not settled

The estate project could be `CCRLT` (the trust whose estate the app administers) or `HOR` (House
of Ransom, the trustee, and the Lane B code). `CCRLT` is proposed on the reasoning in that file's
CAPACITY section. **If `HOR` is right, change it before creating the project** — the ID contains
the capacity code, and IDs are never reused, so changing it afterwards means a new ID and a
`REPLACED` row rather than an edit.

The lane is not in doubt. It is Lane B either way.

### 📁 `CP-DIGP-001` is deliberately almost empty

Its knowledge base is the standards and the control plane's own status record. The gate checklist
lives in Google Drive and is `CONFIDENTIAL`; a human attaches the current packet when a task needs
it. That is not an omission to be corrected — see that file's "Read this before creating the
project".

---

## 🔄 Keeping them current

A bundle is a **copy as of its build time**. It is not evidence that the repository still says the
same thing.

- After any change to a listed source: `npm run projects:build -- <ID>` and re-upload.
- **After a change to a controlling standard: rebuild everything.** All six projects list the
  standards, so all six go stale at once.
- Each definition file has a `🔄 REBUILD TRIGGERS` section naming what specifically matters for
  that project.

`npm run projects` runs on every pull request, so a definition that points at a file someone
deleted or renamed fails the build rather than producing a bundle with a hole in it.

---

## 🛑 What creating these projects does not authorize

Loading a project with estate documents, release-gate context or a notice template does not
authorize filing, recording, signing, publishing or sending anything. Executive OS §10's approval
boundary is unchanged and is restated inside each project's own instructions in the terms that
apply there.

**Convenient access is not consent.** That is the whole reason each project says it out loud.
