# 🌐 DOMAIN_NETWORK.md — the excellencedistrict.org property map

**Canonical file.** This is the single source of truth for which hostname serves which property
across `Khu-el/Khu-el`, `Khu-el/Neterverse_DAO`, and `Khu-el/Mental-Alchemy`. The sibling repos
link here rather than keeping their own copy (Executive OS §4 — artifact-first continuity; one
map, not three).

Companion file: [`docs/CONNECTORS.md`](CONNECTORS.md) — the connector, tool, and plugin registry
for the same network.

---

## 🛑 Nothing in this file has been executed

Every DNS row below is a **plan**. No record was created, no nameserver was touched, no site was
published, and no domain was purchased or transferred. Executive OS §10 puts DNS edits, domain
purchases, publishing, and account changes on the human side of the approval boundary. A row in
this table is a `CURRENT_INTERNAL_MODEL` assertion about what *should* exist, not a claim that it
does.

---

## 📍 Hostname map

| Host | Serves | Backed by | Status |
|---|---|---|---|
| `excellencedistrict.org` | Public marketing site | Squarespace (A records) | 🟡 Live, serving a "Coming Soon" placeholder |
| `www.excellencedistrict.org` | Same, canonical redirect | Squarespace (`ext-sq.squarespace.com`) | 🟡 Live, same placeholder |
| *MX on the apex* | Mail for `khuel@excellencedistrict.org` | Google Workspace | ✅ Live and routing |
| `apps.excellencedistrict.org` | The four NTE planning tools + hub | GitHub Pages, this repo | ❓ Planned — record not yet created |
| `api.excellencedistrict.org` | The shared Express/SQLite backend | Fly.io, `server/` | ❓ Planned — backend not yet deployed |

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

Three repositories and one domain. They cross-link; they do not merge.

| Property | Repo | Lane | Where it lives |
|---|---|---|---|
| NTE hub + four planning tools | `Khu-el/Khu-el` | Lane A, plus Lane B in Legacy & Estate | `apps.excellencedistrict.org` (planned) |
| Shared backend | `Khu-el/Khu-el` `server/` | Serves both lanes, invite-only | `api.excellencedistrict.org` (planned) |
| Neterverse Administration Trust DAO portal | `Khu-el/Neterverse_DAO` | Public-facing | Static `index.html`, not yet hosted |
| The Mental Performance Playbook | `Khu-el/Mental-Alchemy` | `PERSONAL` | Local only — **deliberately unpublished** |

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
- **Registrar, mail provider, and admin address:** Squarespace and Google Workspace notification
  emails dated 10 Sep 2026. `DOCUMENT_CLAIM`.
- **Every `apps.` and `api.` row:** `CURRENT_INTERNAL_MODEL` — proposed here, not observed
  anywhere.
- **Two open deadlines carried from the cutover runbook:** ICANN registrant verification
  (25 Sep 2026) and the Squarespace trial (24 Sep 2026). Both gate this plan — if the domain goes
  to registry hold, every hostname above stops resolving regardless of how correct this file is.
