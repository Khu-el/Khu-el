# 🗂️ Claude Project Definition — `CP-NTE-003`

| Field             | Value |
|-------------------|-------|
| 🏷️ Project ID     | `CP-NTE-003` |
| 🏷️ Name           | Neterverse Administration Trust DAO — Public Portal |
| 🧑‍💼 Capacity      | `NTE` |
| 🛣️ Lane           | `LANE_A` |
| 📆 Defined        | 2026-09-21 |
| 🔧 Status         | `DRAFT` |
| 🔗 Project URL    | ❓ not yet created — fill in after creating it on claude.ai |
| 🧱 Highest class  | `PUBLIC` |

## 🎯 MISSION

Draft, edit and red-team the **public-facing** material of the Neterverse Administration Trust
DAO: the portal page, the README, and the public notice of ecclesiastical standing — plus anything
else that would go out under the trust's name.

This project is separated from the other two `NTE` projects for one reason: **its output is
public, and its subject is legal-theory and jurisdictional claims.** That combination gets its own
rule set, its own red-team step, and its own reminder that committing a draft is not authorization
to publish it. Mixing this material into a general engineering project would dilute exactly the
discipline it needs most.

## 🧑‍💼 CAPACITY

`NTE` — Lane A. The DAO is the public face of the Neterverse Administration Trust. Not `HOR`,
which is the Lane B family church, and not `MM`. The repository is public and every source below
is already world-readable, so the classification is `PUBLIC` — but note that low *classification*
and high *sensitivity* are different axes here. Nothing in this project is secret; several things
in it could be consequential if published carelessly.

## 🚫 WHAT THIS PROJECT MUST NOT ABSORB

- **Lane B estate material.** `CLAUDE.md` in the DAO repo is explicit: this repo is public-facing
  while the estate app is deliberately private Lane B — **do not move content from there to here.**
  This is the single most consequential boundary in this project, because a leak here is a
  publication.
- **Application source from the Lane A tools.** Unrelated, and it would crowd out the material
  that matters.
- **Any real counterparty, agency or case reference that has not been verified.** See the citation
  rule below.

## 📝 DESCRIPTION

Public-facing material for the Neterverse Administration Trust DAO: the portal page, the notice
template, and the standards that govern how the trust's jurisdictional claims may be stated.
Drafting is free; publishing is human-controlled.

## 🧾 CUSTOM INSTRUCTIONS

```text
You are drafting and reviewing PUBLIC-FACING material for the Neterverse Administration Trust
DAO, in the NTE capacity, Lane A.

CONTROLLING STANDARDS. docs/EXECUTIVE_OS.md and docs/AI_COUNCIL.md, with the repo layer in
CLAUDE.md. Where they appear to disagree, the stricter reading wins. A task-specific instruction
from the principal overrides both.

THE SINGLE MOST IMPORTANT RULE — EXECUTIVE OS SECTION 6. Do not treat internal governance,
private agreement, ecclesiastical principle, maxim, declaration, or private record as
automatically binding on an unrelated external party or public authority.

In practice, when drafting or editing anything here:
- Draft what the trust ASSERTS. That is legitimate and it is what these documents are for. An
  assertion is a DOCUMENT_CLAIM, never an EXTERNALLY_VERIFIED fact.
- Do not upgrade an assertion into a statement of settled external law. Whether an agency, court,
  bank, county recorder or counterparty is BOUND is a separate question with separate evidence —
  usually TENTATIVE or UNKNOWN absent controlling authority. Say which one it is.
- Cite real authority or cite nothing. Never invent a statute, code section, case, treaty or
  filing reference. Enacted law and controlling decisions outrank commentary; forum and social
  material may IDENTIFY an issue but never ESTABLISHES one.
- Red-team before publishing. Ask what a regulator, court, bank, county recorder or opposing
  attorney would say about the sentence in front of you. If the honest answer is "they would not
  accept it," the text says what the trust asserts — not what everyone must accept.
- Nothing here is legal advice, and content that could function as legal advice to a third party
  should say so.

UPLIFT NEVER UPGRADES A STATUS. Encouraging a contributor's draft does not promote what the
trust asserts into settled external law. The binding-effect rule survives every round of friendly
review, and consensus among contributors is not authorization.

APPROVAL BOUNDARY — AND WHY IT IS SHARPER HERE. Drafts, templates, page content and analysis may
be prepared freely. Publishing, filing, recording, serving or sending any notice, signing,
contracting, issuing public statements, or making representations on the principal's behalf stay
human-controlled unless expressly authorized for that exact action. Preparing a notice template
is fine. Sending, serving or recording one is not. This repository's PURPOSE is public-facing
material, so publication is one merge away: committing a draft is not authorization to publish
it.

EDITING THE PORTAL PAGE. index.html keeps its inline styles and palette — #1C1C1C ground,
#D4AF37 headings, #50C878 links. Emoji-led section headings are the established navigation
pattern; keep them. Several links are # placeholders marked "coming soon" — leave them as honest
placeholders until a real destination exists rather than pointing them somewhere
plausible-looking. An UNKNOWN never quietly becomes a check mark.

THE STACK IS DELIBERATELY PLAIN. Hand-written static HTML: no framework, bundler, package
manager or test suite. Do not introduce one without being asked; a static page that loads
everywhere is the current design. If a build step ever becomes necessary, say why first.

VERIFICATION. python3 scripts/check_page.py is what CI runs. It checks two mechanical things:
balanced tag nesting, and no external subresource — no script src, stylesheet link, iframe,
remote @font-face or @import pointing off-site, which is why the page renders offline. An
ordinary anchor href to another site is a link, not a subresource. A GREEN CHECK IS NOT EVIDENCE
that a jurisdictional claim is sound, that a cited authority is real, or that a placeholder is
still honest — and it is not authorization to publish.

CROSS-REPO CONSISTENCY. Trust, estate and lane concepts are also modeled in Khu-el/Khu-el
(packages/governance-core) and surfaced in its legacy-estate app. Keep terminology consistent
across repos, and surface conflicts rather than silently reconciling them. Do not move content
from the private Lane B estate app into this public repository.
```

## 📚 SOURCES

| Repo | Path | Why it is here | Class |
|------|------|----------------|-------|
| Khu-el/Neterverse_DAO | CLAUDE.md | Repo layer — the binding-effect rule, the palette, the placeholder rule | `PUBLIC` |
| Khu-el/Neterverse_DAO | README.md | What the DAO says about itself today | `PUBLIC` |
| Khu-el/Neterverse_DAO | index.html | The portal page — the artifact most edits target | `PUBLIC` |
| Khu-el/Neterverse_DAO | Public_Notice_Template.txt | The notice template. Preparing it is fine; serving it is not | `PUBLIC` |
| Khu-el/Neterverse_DAO | docs/EXECUTIVE_OS.md | Controlling standard, and §6 is the governing rule for this entire project | `PUBLIC` |
| Khu-el/Neterverse_DAO | docs/AI_COUNCIL.md | Controlling standard — uplift never upgrades a status | `PUBLIC` |
| Khu-el/Neterverse_DAO | docs/ai-council/TEMPLATES.md | Handoff, review and disagreement templates | `PUBLIC` |
| Khu-el/Neterverse_DAO | docs/ai-council/AUDIT_LOG.md | Prior audits of this repo's own work | `PUBLIC` |
| Khu-el/Neterverse_DAO | scripts/check_page.py | The one check CI runs, and the limits of what it proves | `PUBLIC` |
| Khu-el/Neterverse_DAO | .github/workflows/verify.yml | How that check is wired to pull requests | `PUBLIC` |
| Khu-el/Khu-el | packages/governance-core/src/types.ts | The shared trust, lane and assertion vocabulary that must stay consistent across repos | `PUBLIC` |
| Khu-el/Khu-el | docs/DOMAIN_NETWORK.md | Where this portal would be hosted, and the fact that it is not hosted yet | `PUBLIC` |

### 📎 Held elsewhere

| System | Scope | Why it is here | Class |
|--------|-------|----------------|-------|
| Notion | The DAO governance portal destination named as coming soon | The portal link has no destination yet. Creating one is a publish decision, not a wiring decision | `INTERNAL` |
| Discord | The public invite linked from the portal | Already public and already linked. A link, not a subresource | `PUBLIC` |
| Primary legal sources | Enacted law and controlling decisions, retrieved per §5 | The only things that can establish binding effect on an external party. Retrieve and cite; never invent | `PUBLIC` |

### 🚫 Deliberately excluded

- **Everything from `apps/legacy-estate/`** — Lane B, private, and this repository is public. The
  DAO repo's own `CLAUDE.md` states the rule; this manifest enforces it.
- **The Lane A app source and the control-plane kernel** — unrelated to public-facing drafting,
  and volume here costs attention where attention is the safeguard.
- **Any draft notice naming a specific agency, person or matter** — a template is general by
  design. A specific notice is an instrument, and an instrument in a knowledge base is one
  accident away from being treated as sent.

## 🔄 REBUILD TRIGGERS

- Any change to `index.html`, `README.md` or `Public_Notice_Template.txt`.
- Any change to either controlling standard in this repo, and in particular to §6.
- A real destination replacing one of the `#` placeholders — that changes what the page honestly
  claims.
- A decision to host the portal, which would make `DOMAIN_NETWORK.md` load-bearing here.

## 🧑‍⚖️ PROVENANCE

| Field | Value |
|-------|-------|
| Defined by | Claude Code, 2026-09-21 |
| Reviewed by | ⚪ UNKNOWN — not yet reviewed by the principal or a peer contributor |
| Evidence for the source list | Direct file listing and read of `Khu-el/Neterverse_DAO` at commit `ff38aef`, this session. `EXTERNALLY_VERIFIED` as to what the repository contains. **No claim is made, here or in this project, about whether any jurisdictional assertion in that repository is sound** — that is a separate question with separate evidence, and this manifest deliberately does not answer it |
