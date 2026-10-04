# 🔌 Integration health — 2026-09-10

**AS OF:** 2026-09-10T23:26Z · Source-of-truth systems and what was actually
proven about each.

---

## ✅ Verified this session

| System | Role | Call that proved it | Write authorized |
|---|---|---|---|
| GitHub | Source code, PRs, releases | `get_me` → `Khu-el` | Yes, branch scope |
| Google Drive | Files, evidence, issued artifacts | `list_recent_files`, `read_file_content` | No |
| ClickUp | Task execution ledger | `get_workspace_hierarchy` → 3 spaces | No |
| Notion | Governance, knowledge, registries | `get-users self` | No |
| Google Calendar | Time truth | `list_calendars` → 7 calendars | No |
| Gmail | Email record | `list_labels` | No |

---

## 📋 CATALOG — listed, never exercised

Zapier · Composio · IFTTT · Cloudflare · Shopify · Wix · Canva · ElevenLabs ·
Firecrawl · Floot · vidIQ · Zoom · Otter · Indeed

**CATALOG is not PRODUCTION.** None of these may be described as connected until
a call returns and the entry records which call.

---

## 💡 Findings worth acting on

**🕐 Two timezones across one calendar set.** The primary calendar runs
America/New_York; the five classroom calendars run UTC. A scheduled task that
assumes one timezone across all seven will place events an hour or more wrong,
seasonally.

**🗂️ ClickUp already enforces the lane split structurally.** House of Ransom
(Lane B) is its own space, separate from Team Space. Retired and migrated folders
carry the change in the folder name rather than being deleted — provenance
preserved, which is the same instinct the event log encodes.

**📁 Drive holds the live commercial control record.** A dated release-control
packet sets commercial release state to HOLD pending open evidence gates. Drive
stays the system of record; this public repository records only that the project
exists and is on HOLD — no gate detail, product name or identifier.

**⚔️ Competing architecture documents.** Several February 2026 governance
documents overlap with no supersession marking. Which controls is ❓ UNKNOWN.

**🔁 Possible duplicate command centers.** Two private repositories in the account
are named or described as a command center. Neither is readable from this
session. Review them before building any further control-plane surface. Both
findings are recorded in ADR-0001.
