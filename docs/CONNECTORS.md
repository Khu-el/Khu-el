# 🔌 CONNECTORS.md — connectors, tools, and plugins on the domain network

**Canonical file.** Companion to [`docs/DOMAIN_NETWORK.md`](DOMAIN_NETWORK.md), which maps
hostnames. This one maps capabilities: what is connected, to which property, and what each one is
and is not allowed to do.

---

## ⚠️ Read this before adding anything

A connector listed here is available **to an agent session working in this account**. None of them
is wired into an app, and none should be without an explicit, per-integration instruction. Three
existing boundaries survive this file unchanged:

- 🚫 **No third-party send.** `sendSelfEmail()` hard-codes `req.user.email`. There is no recipient
  field in any client or server path. A connector that can email arbitrary people does not create
  one.
- 🚫 **No network calls in Mental Alchemy.** That app has no `fetch` and keeps none. Its data is the
  most personal in the account and stays in browser `localStorage`.
- 🛑 **§10 approval boundary.** Publishing, filing, recording, serving, signing, transacting, or
  representing the principal externally stays human-controlled, per action. A connector being
  *available* is never authorization to *use* it that way.

Where a connector's reach exceeds a boundary, the boundary wins, and the row below says so.

---

## 📇 Connector registry

**Verdict column:** ✅ PERMITTED — usable within existing boundaries · 🟡 GATED — needs a named
human authorization for that specific action · ⛔️ BLOCKED — would cross a hard boundary as written.

### Already load-bearing

| Connector | Serves | Verdict | Notes |
|---|---|---|---|
| GitHub | All three repos | ✅ | Source of truth. Already how every property is built and deployed. |
| Claude Code Remote | This session | ✅ | Sessions, Routines, PR subscriptions. Backs the scheduled-task spec. |
| Cloudflare Developer Platform | Domain network | 🟡 | Useful for DNS inspection and Workers. **Not** the DNS authority here — Squarespace is, and the zone is DNSSEC-signed. Do not move nameservers. |

### Documents, research, and visuals

| Connector | Serves | Verdict | Notes |
|---|---|---|---|
| Google Drive | Evidence capture for all apps | 🟡 | Reading source documents is fine. Sharing a file changes who can see it — that is a §10 publish action. |
| Notion | Neterverse DAO portal, task registry | 🟡 | The portal's "Notion Portal (Coming Soon)" link has no destination yet. Creating one is a publish decision, not a wiring decision. |
| Firecrawl | Research under §5 | ✅ | Web and paper search. Forum and social results may *identify* an issue; they never *establish* one. |
| Canva · ElevenLabs · vidIQ | Public-facing material | 🟡 | Generation is free; distribution is not. Nothing goes out under the principal's name without authorization. |
| Otter.ai · Zoom | Meeting evidence | 🟡 | Transcripts are `DOCUMENT_CLAIM` evidence at best. Recording consent is a human decision. |

### Mail and calendar

| Connector | Serves | Verdict | Notes |
|---|---|---|---|
| Gmail | `khuel@excellencedistrict.org` once Workspace is live | 🟡 | Reading, searching, and drafting are fine. **Sending to a third party is a §10 action and is never implied.** This connector does not relax the server's self-send-only rule; the two are separate systems. |
| Google Calendar | Scheduling around the app network | ✅ | Reading and proposing times. Inviting external attendees is a send. |

### Automation and workflow

| Connector | Serves | Verdict | Notes |
|---|---|---|---|
| Zapier · IFTTT · Composio | Cross-property automation | ⛔️ as written | Each can fire outbound actions at arbitrary third parties on a trigger. That is exactly the "no automatic sends" boundary. Any use needs a named, scoped authorization per Zap/applet, not a blanket one. |
| ClickUp | Task tracking | 🟡 | Would duplicate `docs/scheduled-tasks/REGISTRY.md`. Per SPEC v2's SEARCH → READ → REUSE → UPDATE rule, reuse the registry before creating a second task system. |

### Commerce and site building

| Connector | Serves | Verdict | Notes |
|---|---|---|---|
| Wix · Shopify · Floot | Nothing currently | ⛔️ for this network | The apex is Squarespace-hosted and the apps are Vite + React on Pages. Introducing a fourth hosting stack fragments a network this file exists to consolidate (§9 — strengthen the ecosystem rather than starting another project). |
| Indeed | Nothing | ⛔️ | No property in this account has a hiring surface. |
| Anthropic Economic Index | Background research only | ✅ | Describes observed Claude usage. It supports no claim about anyone's job or the labor market. |

---

## 🧰 Tools and plugins

Skills available to a session working here, and where each one legitimately applies.

| Skill | Applies to |
|---|---|
| `code-review` · `security-review` | Every push to any of the three repos. |
| `dataviz` | Any chart in any app. Its rules and Executive OS §2 agree: no chart without verified data — say **VISUAL OMITTED — VERIFIED DATA INSUFFICIENT** instead. |
| `artifact-design` · `artifact-capabilities` · `artifact-diagramming` | The published artifacts listed below. |
| `docx` · `pdf` · `xlsx` · `pptx` | Draft memo and checklist exports. Drafts — never offering documents or solicitations. |
| `doc-coauthoring` · `internal-comms` | Standards and governance docs in all three repos. |
| `theme-factory` · `brand-guidelines` · `design` · `canvas-design` | Presentation of the above. Neterverse keeps its own palette — see its `CLAUDE.md`. |
| `loop` · `session-start-hook` | Recurring work. **Read `docs/scheduled-tasks/SPEC.md` first** — a recurring task needs a task file and a registry entry before it is scheduled. |
| `mcp-builder` · `claude-api` · `skill-creator` | Extending this list. |

---

## 🖼️ Published artifacts on the network

Artifacts are private by default and live on `claude.ai`, not on `excellencedistrict.org`. They are
listed here so the network map is complete, not because they are public.

| Artifact | Mirrors | Note |
|---|---|---|
| [excellencedistrict.org Network](https://claude.ai/code/artifact/be86581a-d8ce-439c-a352-d762d12b8d40) | `DOMAIN_NETWORK.md` + this file | The hosting half of the domain. Republish it whenever either file changes. |
| [excellencedistrict.org Cutover](https://claude.ai/code/artifact/cd379832-6c31-49a0-9cb2-c7bfc2388d02) | — | The mail half: SPF, DKIM, DMARC, and the Workspace account steps. The network map deliberately does not repeat it. |
| [Deal Architect](https://claude.ai/code/artifact/c0aa02d6-93f7-4559-97bb-e0a334e813b0) | `apps/deal-architect` | Static snapshot of a build. |
| [Capital Readiness](https://claude.ai/code/artifact/a62d3613-e2b7-4c94-90a1-93ef775cd061) | `apps/capital-readiness` | Static snapshot of a build. |
| [Notes Underwriting](https://claude.ai/code/artifact/88a01535-2e71-44cb-8b35-d801f47999ae) | `apps/notes-underwriting` | Static snapshot of a build. |
| [Legacy & Estate](https://claude.ai/code/artifact/ece6a9a8-e27e-4ff9-868f-45be6896aa1f) | `apps/legacy-estate` | Static snapshot of a build. Lane B — the link is private, like the workspace. |
| The Equity Ledger · Privateman Content Audit · Morning Brief | — | Standalone. Not part of the app network. |

The four app snapshots carry no backend sync and no account; the repo apps are the live versions.
They were **not** regenerated when this registry was written, so each is as of its own publish date.

Where an artifact and a repo file disagree, **the repo file wins** and the artifact gets
republished. Snapshots drift; that is what snapshots do.

---

## ➕ Adding a connector properly

1. **Search this file and `REGISTRY.md` first.** If something here already covers the need, extend
   it instead of adding a parallel path (§4).
2. **Name the exact action**, not the connector. "Read the shared Drive folder" is a scope. "Wire
   up Drive" is not.
3. **Check it against the three boundaries at the top.** If it crosses one, it needs an explicit
   waiver naming that boundary — not a judgment call made mid-task.
4. **Record its evidence class.** Anything a connector returns is `DOCUMENT_CLAIM` or
   `CURRENT_INTERNAL_MODEL` until a human or an authoritative source confirms it. A connector
   returning a value is not verification, and an integration must never let ❓ UNKNOWN quietly
   render as ✅.
5. **Add a row above** with a verdict, and say what changed in the commit.
