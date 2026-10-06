# 🌐 DOMAIN_NETWORK.md — the excellencedistrict.org property map

**Canonical file — for `excellencedistrict.org` only.** This is the single source of truth for
which hostname on **that domain** serves which property, across `Khu-el/Khu-el`,
`Khu-el/Neterverse_DAO`, and `Khu-el/Mental-Alchemy`. The sibling repos link here rather than
keeping their own copy (Executive OS §4 — artifact-first continuity; one map, not three).

🚩 **It is not a map of every property in the account, and no longer claims to be.** The principal
decided on 2026-10-02 that `Neterverse.tech` is a **deliberately separate network with its own
governance** — not on this domain, not under this repository's boundary, and not this file's to
describe beyond the pointer below. That decision closed `SOURCE_CONFLICTS.md` SC-09. Before adding
a property here, check it is actually on `excellencedistrict.org`; if it is not, this is the wrong
file.

Companion file: [`docs/CONNECTORS.md`](CONNECTORS.md) — the connector, tool, and plugin registry
for the same network.

---

## 🛑 Nothing this file proposes has been executed

The hostname map below holds two kinds of row, and they are not the same kind of claim:

- **Observed rows** carry an observation date. They record what a hostname was serving when it was
  last probed — including sites and records created outside this repository. They are
  `EXTERNALLY_VERIFIED` as of that date and are not plans.
- **Planned rows** (`apps.`, `api.`) are `CURRENT_INTERNAL_MODEL` assertions about what *should*
  exist, not a claim that it does.

Nothing this file proposes has been carried out from it: no record it plans was created, no
nameserver was touched, and no domain was purchased or transferred on its account. Executive OS §10
puts DNS edits, domain purchases, publishing, and account changes on the human side of the approval
boundary.

---

## 📍 Hostname map

| Host | Serves | Backed by | Status |
|---|---|---|---|
| `excellencedistrict.org` | The Excellence District public site — 32 pages | A records `162.159.143.30`, `172.66.3.26` (Cloudflare-fronted); DNS still on Squarespace nameservers. Hosting platform 🟠 inferred to be the same `chatgpt.site` build as `events.` below | ✅ Live, serving the full site — observed 2026-10-06. **No longer a "Coming Soon" placeholder** |
| `www.excellencedistrict.org` | Nothing | — | ❌ Does not resolve (NXDOMAIN, A and CNAME) — observed 2026-10-06. Previously recorded here as live |
| `events.excellencedistrict.org` | A full second copy of the public site (32 pages, each canonical to the apex home page) | CNAME `custom-domains.chatgpt.site` | ⚠️ Live duplicate — observed 2026-10-06. Retire / redirect / keep is the principal's decision |
| `neterverse.excellencedistrict.org` | The Neterverse public gateway — 12 pages | CNAME `custom-domains.chatgpt.site` | ✅ Live — observed 2026-10-06 |
| `solutions.excellencedistrict.org` | The technology studio's public site | CNAME `custom-domains.chatgpt.site` | ✅ Live — observed 2026-10-06 |
| `sui.excellencedistrict.org` | Sui Generis house | CNAME `custom-domains.chatgpt.site` | 🧱 Resolves, but returns HTTP 401 behind a sign-in wall — observed 2026-10-06 |
| *MX on the apex* | Mail for `khuel@excellencedistrict.org` | Google Workspace | ✅ Live and routing |
| `apps.excellencedistrict.org` | The four NTE planning tools + hub | GitHub Pages, this repo | ❓ Planned — record not yet created |
| `api.excellencedistrict.org` | The shared Express/SQLite backend | Fly.io, `server/` | ❓ Planned — backend not yet deployed |
| *(none — `*.supabase.co`)* | The Excellence District member portal's backend (ADR-0004) | Supabase, "The Excellence District Production" project | 🟡 Project live; portal schema hardening not yet applied. No hostname on this domain is planned — the frontend is served from Pages beside the other apps at `/member-portal/` |

**The apex is deliberately left alone.** The A records, the `www` CNAME, the five Google MX rows,
and the `google-site-verification` TXT all stay exactly as they are. Moving the apex to GitHub
Pages would take the Squarespace site down and put the Workspace verification at risk on a domain
whose ICANN registrant verification is still pending. The network hangs off subdomains instead,
which is additive and reversible.

---

## 🧾 DNS rows a human needs to add

Squarespace → **Domains → excellencedistrict.org → DNS Settings → Custom Records**. Columns are
Host, Type, Priority, TTL, Data.

| Host | Type | Data | Why |
|---|---|---|---|
| `apps` | CNAME | `khu-el.github.io` | Points the app network at GitHub Pages |
| `api` | CNAME | `<your-app-name>.fly.dev` | Points the backend hostname at Fly |

Two rules that break this if ignored:

- **Do not add a second `v=spf1` record.** The cutover runbook already covers SPF, DKIM, and DMARC
  on the apex. Neither row above is a mail record and neither needs one.
- **Do not add a CAA record and do not move the nameservers.** The zone is Squarespace-served and
  DNSSEC-signed; both changes break TLS renewal or resolution outright.

### GitHub side, after the `apps` CNAME resolves

Order matters here. Attaching a custom domain before DNS resolves takes the site off
`khu-el.github.io/Khu-el/` and serves nothing in its place.

The site publishes from a GitHub Actions workflow, and in that mode **GitHub ignores any `CNAME`
file** — so the domain is attached in the repository settings, not by a file or a workflow step.
(A `PAGES_CUSTOM_DOMAIN` variable that wrote `_site/CNAME` existed until 2026-09-23; it could never
have attached anything and was removed.)

1. Confirm `dig +short CNAME apps.excellencedistrict.org` returns the Pages target.
2. **Settings → Pages → Custom domain** → `apps.excellencedistrict.org` → Save. Wait for the DNS
   check to pass and tick **Enforce HTTPS**. GitHub issues the certificate; allow up to an hour
   after propagation.
3. Re-run "Deploy web apps to GitHub Pages". The apps are built for the path `configure-pages`
   reports: `/Khu-el/...` before a custom domain, `/...` after one. Until this re-run, the site
   is served at the new domain but the apps are still built for `/Khu-el/`, and render blank.

To detach, clear the custom domain in the same settings page and re-run the workflow; the site
returns to `khu-el.github.io/Khu-el/`.

**Then move the member portal's auth links (ADR-0004).** Supabase Auth sends confirmation and reset
links only to its Site URL or an allow-listed redirect, and **silently falls back to the Site URL**
for anything else. In the Supabase dashboard → **Authentication → URL Configuration**, set the Site
URL to `https://apps.excellencedistrict.org/member-portal/` and add
`https://apps.excellencedistrict.org/**` to the redirect URLs — keep `https://khu-el.github.io/Khu-el/**`
as well, for the same fallback reason as `CORS_ORIGINS` below.

### Fly side, after the `api` CNAME resolves

```sh
fly certs add api.excellencedistrict.org
fly secrets set CORS_ORIGINS=https://apps.excellencedistrict.org,https://khu-el.github.io
fly deploy
```

Both origins are listed on purpose: `khu-el.github.io` keeps working while DNS propagates and
stays valid as a fallback if the custom domain is ever detached.

### Repo variable

**Settings → Secrets and variables → Actions → Variables** → `VITE_API_BASE_URL` =
`https://api.excellencedistrict.org`. Until this is set, every deployed app falls back to
`http://localhost:4000` and renders as offline. That is the intended failure mode — it shows
"offline," it does not invent data.

---

## ✅ Verification, once the rows are in

```sh
# apps — expect the GitHub Pages CNAME target, then a 200 from the hub
dig +short CNAME apps.excellencedistrict.org
curl -sI https://apps.excellencedistrict.org | head -1

# api — expect the Fly hostname, then a health response
dig +short CNAME api.excellencedistrict.org
curl -s https://api.excellencedistrict.org/health

# apex and mail must be UNCHANGED by any of the above
dig +short A excellencedistrict.org
dig +short MX excellencedistrict.org
```

The last two commands are the regression check. If the apex A records or the Google MX rows moved,
something was edited that should not have been.

---

## 🗺️ The wider network

Three repositories and one domain on the `excellencedistrict.org` network. They cross-link; they
do not merge.

| Property | Repo | Lane | Where it lives |
|---|---|---|---|
| NTE hub + four planning tools | `Khu-el/Khu-el` | Lane A, plus Lane B in Legacy & Estate | `apps.excellencedistrict.org` (planned) |
| Shared backend | `Khu-el/Khu-el` `server/` | Serves both lanes, invite-only | `api.excellencedistrict.org` (planned) |
| The Excellence District member portal | `Khu-el/Khu-el` `apps/member-portal` + Supabase | Lane A, invited members; never reads `server/` | `/member-portal/` beside the apps; backend on `*.supabase.co` |
| Neterverse Administration Trust DAO portal | `Khu-el/Neterverse_DAO` | Public-facing | Static `index.html`, not yet hosted |
| The Mental Performance Playbook | `Khu-el/Mental-Alchemy` | `PERSONAL` | Local only — **deliberately unpublished** |

### 🚩 Properties on a second network, not covered by the plan above

Recorded 2026-10-02 from the Notion governance workspace, which is the system of record for
governance and knowledge. **This file previously described itself as the map of every property
and did not mention any of these.** They are listed so the gap is visible; none is on
`excellencedistrict.org` and no row above changes.

| Property | Where it lives | Status in Notion | Lane |
|---|---|---|---|
| `Neterverse.tech` platform | Its own hostname — Next.js, Postgres, object storage, card payments | **Live** | Lane A |
| NTE Agent Suite | `Khu-el/nte-agent-suite` (separate repo, React Native / Expo) | Built | Lane A |
| `Khu-el/NTE-Command-Center` | Private repo — superseded generation, see `SOURCE_CONFLICTS.md` SC-03 | — | Lane A |
| `Khu-el/StructureGen` | Private repo — structure-design tool, last touched 2025-12 | — | Lane A |

⚠️ **`Neterverse.tech` is live and takes payment, and nothing in this repository governs it.**
Its hostname is not on this domain, its stack is not the Vite + React + Pages stack described
above, and its data store is not the invite-only backend in `server/`. Whether it should be
brought onto this map, or deliberately kept as a separate network, is the principal's decision —
recorded in `docs/continuation/HUMAN_ACTION_REQUIRED.md`. Until it is decided, **this file is
canonical for `excellencedistrict.org` only**, not for "every property in the account."

*Evidence: Notion `🏛️ Neterverse Trust Enterprise — 2026 Command Center` (`NTE-GOV-2026-CMD-001`),
read 2026-09-18. `EXTERNALLY_VERIFIED` as a record of what Notion states; the live status of the
platform itself was not probed from this session and is 🟠 `DOCUMENT_CLAIM`.*

🚩 **Probed 2026-10-06, and the probe disagrees with the Notion record.** `http://neterverse.tech/`
returned IONOS's default parking page ("Diese Domain ist bereits registriert"), `https://` did not
connect, and the zone is on IONOS nameservers with no DMARC record. `EXTERNALLY_VERIFIED` for what
that hostname served on that date. It does **not** establish that no platform exists elsewhere —
only that this hostname was not serving one. "Live" and "takes payment" above remain a
🟠 `DOCUMENT_CLAIM` that the one live observation contradicts; reconciling the two is the
principal's call, not this file's.

**Mental Alchemy is not on the network and should not be added to it casually.** All of its state
is browser `localStorage` with no account system, which is a feature. It appears on the hub as a
source link, not as a hosted app.

**Lane A and Lane B still never auto-connect.** Sharing a parent domain is a hosting fact, not a
data relationship. A shared hostname creates no bridge between the Legacy & Estate workspace and
the Lane A tools; the only bridge remains the Business Interests registry, which records a
reference rather than a merge.

---

## 📎 Evidence

- **Apex, `www`, MX, and TXT rows marked live:** live DNS-over-HTTPS queries against Google and
  Cloudflare public resolvers, 11 Sep 2026, recorded in the `excellencedistrict.org Cutover`
  artifact. `EXTERNALLY_VERIFIED` as of that date; re-check before relying on them.
- **Apex, `www`, `events.`, `neterverse.`, `solutions.` and `sui.` rows dated 2026-10-06:** live
  DNS-over-HTTPS queries against Cloudflare's public resolver plus HTTP requests and a crawl of
  each site, from a read-only site audit on that date. `EXTERNALLY_VERIFIED` as of that date. Those
  four subdomains were created outside this repository and were not in this map before; they are
  recorded as observed, not as planned by this file. The same audit found **no SPF and no DMARC
  record** on the apex — only the `google-site-verification` TXT — so the SPF/DKIM/DMARC step the
  cutover runbook covers has not landed in DNS.
- **Registrar, mail provider, and admin address:** Squarespace and Google Workspace notification
  emails dated 10 Sep 2026. `DOCUMENT_CLAIM`.
- **Every `apps.` and `api.` row:** `CURRENT_INTERNAL_MODEL` — proposed here, not observed
  anywhere.
- **Two open deadlines carried from the cutover runbook:** ICANN registrant verification
  (25 Sep 2026) and the Squarespace trial (24 Sep 2026). Both gate this plan — if the domain goes
  to registry hold, every hostname above stops resolving regardless of how correct this file is.
