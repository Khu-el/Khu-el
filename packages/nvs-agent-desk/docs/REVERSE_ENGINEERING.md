# Reverse-engineering dossier — 10 repos from @naldzyul's post

| | |
|---|---|
| **Entity** | NTE Virtual Solutions (NVS) |
| **Lane** | NVS commercial delivery (assumed — **confirm**) |
| **Client / tenant** | none (internal R&D) |
| **Source of truth** | The ten upstream repos at the commits below, plus the post |
| **Owner** | Chief Ransom |
| **Confidentiality** | INTERNAL |
| **State** | Dossier DRAFTED. Code LOCALLY_TESTED (75 tests, `tsc` clean). Nothing saved to a remote, published, or deployed. |

Source post: https://x.com/naldzyul/status/2112472662270165092 (2026-10-20, 1,021 likes). Its title claim, "10 repos that make you money while you sleep", is marketing. I found **no revenue or performance evidence** for any repo in what I read (see §Reading the claim).

## Method and its limits (read this first)

- **What I did:** shallow-cloned each repo (commit SHAs below), read the README, the directory layout, and the specific files that decide each design question (execution path, auth, send gating, licensing, telemetry). Everything was read only. **No upstream code was executed.**
- **What I did not do:** a line-by-line audit. Two of the repos are very large (Vibe-Trading ≈ 3,000 files, hyperframes ≈ 9,600 files, Fincept ≈ 3,500 files). For those, claims below are about the parts I opened. Anything I only read in a README is labelled **DOCUMENT-STATED**.
- **Evidence labels** (repo vocabulary): `VERIFIED` = I saw it in source at the SHA below · `DOCUMENT-STATED` = README says so, not checked in code · `INFERRED` = my reasoning, flagged.
- Four of the post's links were truncated at 30 characters. I resolved them from the repo names and confirmed each by fetching the repo. Two moved: `toprank` is now titled **NotFair Plugin**; `open higgsfield ai` is `Anil-matcha/Open-Higgsfield-AI` (retitled "Open Generative AI"; an `Autom8AI/` mirror also exists).

| # | Repo | Commit (date) | License |
|---|---|---|---|
| 1 | The-Swarm-Corporation/AutoHedge (post's URL 404s; org is `The-Swarm-Corporation`) | `c549c7950da1` (2026-03-05) | MIT |
| 2 | HKUDS/Vibe-Trading | `fb1851ae1f88` (2026-10-20) | MIT |
| 3 | AgriciDaniel/claude-ads | `fc3908e786c3` (2026-10-17) | MIT |
| 4 | nowork-studio/toprank → NotFair Plugin | `ed835f273dce` (2026-10-19) | MIT |
| 5 | Fincept-Corporation/FinceptTerminal | `3d8617cae3f1` (2026-10-13) | **AGPL-3.0** |
| 6 | cloudflare/agentic-inbox | `48039bb6785a` (2026-04-17) | Apache-2.0 |
| 7 | mksglu/context-mode | `a1712dbb7af1` (2026-10-20) | **Elastic License 2.0** |
| 8 | jo-inc/camofox-browser | `39c820940134` (2026-10-04) | MIT |
| 9 | Anil-matcha/Open-Higgsfield-AI | `093d71fc7e88` (2026-10-20) | MIT |
| 10 | heygen-com/hyperframes | `8b410f1cb1b0` (2026-10-21) | Apache-2.0 |

**Licensing drives the build strategy.** Fincept (AGPL) and context-mode (ELv2) cannot be copied into an NVS product without taking on their terms, so those two are **clean-room**: built from observed behaviour and public specs (SQLite FTS5), no code reuse. MIT/Apache repos may be adapted with attribution; I adapted *ideas*, not files, and credit them in the source comments. **Source conflict:** Fincept's org profile shows an MIT badge while the repo's `LICENSE` is AGPL-3.0. Stricter reading applies: treat as AGPL. Have counsel confirm before any reuse.

---

## 1. AutoHedge — "autonomous hedge fund"

**What it is.** ≈2,400 lines of Python (19 files) on the `swarms` agent framework. `main.py` wraps one `director_agent`; `workers.py` defines Sentiment, Quant, Risk-Manager and Execution agents on `gpt-4o-mini` / `gpt-4.1`; tools call Jupiter (Solana swaps), Yahoo, Polygon, Exa. `VERIFIED`

**Architecture, as the code has it.** The README shows a linear Director → Quant → Risk → Execution pipeline. The code is a Director with `handoffs=ALL_AGENTS`: the LLM decides who runs and in what order, and a fifth (Sentiment) agent exists that the README doesn't mention. `VERIFIED` (workers.py)

**The finding that matters.**
- The "Risk-Manager" is a system prompt that asks the model to "provide a recommended position size". I grepped the package for stop-loss / max-position / drawdown / paper / dry-run / confirm and found them **only inside prompt text**, no code-level limit. `VERIFIED` (grep of `autohedge/`; absence in the files I searched, not proof across the whole tree)
- `tools/ultra_tools.py:execute_trade` signs a Jupiter transaction with a private key read from the environment and submits it. No approval step, spend cap, kill switch, or paper mode in that path. `VERIFIED`
- README says the env var is `WALLET_PRIVATE_KEY`; the code reads `SOLANA_PRIVATE_KEY` (ultra_tools.py:60). README "Basic Usage" is a code block containing only the word `autohedge`. Docs and code disagree. `VERIFIED`
- Last commit 2026-03-05, about 7½ months before this post. `VERIFIED`

**Verdict.** A readable demo of the pattern, not an "enterprise-grade" system. Real-money execution rests on an LLM's judgment plus a hot key.

**NVS version → `src/research/`.** Keep: the Director/Quant/Risk/Execution *roles* and structured thesis. Change: risk is deterministic code (`riskGate.ts`) that an LLM cannot talk past; a thesis must cite evidence at or above `SYSTEM_RECORDED` (an LLM's own inference is `INFERRED` and fails the gate); buys require a stop; `PaperBroker` is the **only** broker; `trade.live` is classed CONSEQUENTIAL and has **no executor**. **Not built, on purpose:** any live venue adapter.

## 2. Vibe-Trading — "your personal trading agent"

**What it is.** A large research workspace (≈3,000 files): per-market backtest engines under `agent/backtest/engines/` (equities in several countries, crypto, futures, FX), a 478-alpha benchmark zoo, SEC-filing/13F readers, multi-agent "teams", persistent memory, MCP server, 14+ chat-channel gateways, and broker connectors (read-only IBKR/mStock probes; eToro; MetaTrader 5; Robinhood agentic trading). `DOCUMENT-STATED` for the feature list; layout `VERIFIED`.

**Its own governance is the best of the ten.** README documents "TAP mode" (credential isolation and human-approved writes), per-day LLM spend budgets for live runners, a halt switch, and states it "holds no funds and never trades outside the limits you set". `DOCUMENT-STATED` (I did not trace TAP in code).

**Warning signs.** (a) The README's top item is a warning that an X account, a Virtuals project and a token contract impersonate the project; **do not interact with any token tied to it**. (b) The changelog for 2026-10-12 through 10-20 lists tens of financial-correctness fixes (e.g. "nine", then "all 14") (annualisation, fee allocation, sign errors, liquidation attribution). That is healthy maintenance, and also evidence that numerics are still moving: treat any backtest number from it as unverified until reproduced. `INFERRED`

**NVS version → `src/research/`.** Rather than clone a 3,000-file system, I took the lessons its changelog keeps re-learning and made them structural: `periodsPerYear` is a **required** argument (no silent annualisation default); undefined metrics are `NaN` rendered `—`, never `0` (zero-variance Sharpe, zero-trade win rate); bars are validated; strategies see a frozen history and fill at the next open (no lookahead); costs are reported. For deeper market coverage, run Vibe-Trading itself in a sandbox as a *source of ideas*, not a dependency.

## 3. claude-ads — ad audits for Claude Code

**What it is.** 434 files; a Claude Code plugin with 33 skills (`skills/ads-*`), a Python core (`claude_ads_core/`) and a `control-plane/` of JSON manifests. `VERIFIED`

**It already gets the hard part right.** `control-plane/manifests/capability-manifest.json` sets `default_mutation_mode: "read-only"`; per-platform `account-mutation` is `live-write` / `disabled`; `account-health-scoring` is `disabled` with the reason "No approved source-grounded control-severity decision set; discovery findings remain unscored". Checks return `pass | fail | unknown | not_applicable`. `VERIFIED` (manifest) and `DOCUMENT-STATED` (README).

**Verdict.** Do not rebuild it to "beat" it on honesty. It is the reference for this repo's rules.

**NVS version → `src/audit/`.** Same four-state result and "unknown is a real answer" and "unscored while anything is unknown" rule (tested). What NVS adds: failed checks become **ledger proposals** (`ads.change`, CONSEQUENTIAL) carrying entity / lane / tenant; a tracking failure downgrades the per-campaign waste check to `unknown` so a broken tag isn't blamed on campaigns; the export reader treats blanks as `null`, never `0`. Honest scope: six checks vs claude-ads' broad catalogue. **Recommendation:** install claude-ads for breadth; use this module for the NVS-specific evidence-and-approval wrapper.

## 4. toprank → NotFair Plugin — SEO and ads skills

**What it is.** 289 files; 48 skills across SEO, GEO/AEO, Google/Meta/X/LinkedIn/Reddit/TikTok ads, GA4/Search Console, WordPress, GoHighLevel. `VERIFIED` (tree) and `DOCUMENT-STATED` (README).

**Notes.** The README says the plugin "registers one hosted NotFair MCP connection" completed via browser OAuth, and that several platforms support "execute approved changes", plus WordPress and GoHighLevel (CRM) write access. That is a **third-party data path**: client ad-account and CRM data would flow through a vendor-hosted service. I did not inspect what that service stores. `DOCUMENT-STATED`; evidence gap.

**NVS version.** No new code: the skills are prompts and workflows, and MIT-licensed. For client work, use them **only against exports or read-only connections** and keep the NVS ledger as the approval boundary; do not connect a client's GoHighLevel or WordPress write access through a hosted MCP without a written client authorization and a data-processing review.

## 5. Fincept Terminal — Bloomberg-style desktop terminal

**What it is.** C++20 / Qt6 desktop app with embedded Python 3.11, ≈1,080 `.cpp` files. Two editions: the open-source repo and a closed **Enterprise** build ($15–$45 /user/mo), plus a separate hosted product (Quantcept). `VERIFIED` (tree, README)

**Verdict.** Not a sensible target for a "better version": it is a multi-year native app, AGPL, and its commercial strategy is an open-core funnel.

**NVS version.** None built, deliberately. The Khu-el repo already has the right shapes (`capital-readiness`, `notes-underwriting`, `deal-architect`) and the NVS `research` module supplies the numerics. If a terminal-style front end is wanted, build it as web UI over those, clean-room. **Do not copy code** (AGPL §13 would extend to any network-served derivative).

## 6. agentic-inbox — Cloudflare's AI email client

**What it is.** React 19 / Hono / Cloudflare Workers; one Durable Object (SQLite) per mailbox, R2 for attachments, Cloudflare Access JWT auth, a Cloudflare Agents SDK chat agent on Workers AI, and an `/mcp` endpoint. 72 files. `VERIFIED`

**What it gets right.** The in-app agent is **draft-only structurally**: `workers/agent/index.ts` registers `toolDraftReply` and its draft siblings, not the send tools, and the system prompt says "Draft Only - Never Send". New inbound mail is scanned for prompt injection and the scanner **fails closed** (`lib/ai.ts`). Production fails closed if Access is not configured (`workers/app.ts`, returns 500 unless `POLICY_AUD` and `TEAM_DOMAIN` are set, then verifies the JWT). `VERIFIED`

**What it doesn't.**
- `workers/mcp/index.ts` registers `toolSendReply` and `toolSendEmail`: any MCP client that passes the Access policy can **send** mail. `VERIFIED`
- No per-mailbox authorization. The README says so ("Any user who passes the shared Cloudflare Access policy can access all mailboxes... including MCP... by passing a `mailboxId`"), and `workers/lib/mailbox.ts:requireMailbox` confirms it: it checks that the mailbox *exists* (`BUCKET.head`) and never who is asking. `VERIFIED`
- The injection scanner is itself an LLM call; and `index.ts:218` carries the author's own note that draft replace is "not atomic". `VERIFIED`

**NVS version → `src/inbox/`.** Per-mailbox, per-role ACL, default deny (`read` / `draft` / `send`); a deterministic injection pre-screen (patterns + hidden-HTML) that fails closed; `email.send` is a ledger action whose approval hash covers recipients, subject and body, and which **lists recipients not already on the thread** for the approver. The package ships **no transport**: sending needs an injected one, and `Khu-el`'s rule (only the signed-in user's own address) is a policy for the transport you plug in, not something this module can know. Honest limit: the pre-screen is a regex heuristic; it catches crude attacks, not clever ones, which is why sends need a human regardless.

## 7. context-mode — keep tool output out of the context window

**What it is.** An MCP server and hook set (320 TypeScript files; hook directories for 10 coding-agent platforms besides Claude Code, though the README claims 17 supported clients). Sandbox tools run code and return only stdout; raw output is indexed into SQLite with two FTS5 tables (`porter unicode61` and `trigram`) and queried with `bm25(chunks, 5.0, 1.0)`. The executor supports ~11 languages. `src/security.ts` reads the host's allow/deny/ask permission patterns. `VERIFIED`

**Verdict.** A good idea well executed. **ELv2: do not copy.** README figures (e.g. "315 KB becomes 5.4 KB", "98% reduction") are the vendor's own and I did not reproduce them. `DOCUMENT-STATED`

**NVS version → `src/context/` (clean-room).** `ContextStore` (FTS5 + bm25, FTS-injection-safe query builder, paragraph chunking, an honest "bytes avoided" stat that is `NaN` before anything is indexed) and `runScript` (think-in-code). **Stated limit:** Node's permission model confines the script to read one directory, no writes, no child processes, scrubbed env, hard timeout. It does **not** block network access (I tested: `fetch` still ran). It is for scripts the agent wrote for you, not untrusted code. Tests assert each denial.

## 8. camofox-browser — stealth browser server for agents

**What it is.** A single 7,267-line Express `server.js` wrapping **Camoufox** (a Firefox fork with fingerprint spoofing in C++), exposing tabs, accessibility snapshots with stable element refs, cookie import, proxy + GeoIP, VNC login, search macros, a `/tabs/:id/evaluate` endpoint that runs arbitrary JS, and Playwright tracing. `VERIFIED` (routes) / `DOCUMENT-STATED` (it "bypasses Google, Cloudflare, and most bot detection"; I did not test that).

**Findings.**
- **Purpose is detection evasion.** The README's own pitch is that Playwright "gets blocked" and this does not.
- **Telemetry on by default.** `lib/reporter.js` sends crash reports to `https://camofox-telemetry.askjo.workers.dev` unless disabled (`crashReportEnabled !== false`; override `CAMOFOX_CRASH_REPORT_URL`). `VERIFIED`
- **Auth:** with no key set, only loopback is allowed outside production. `VERIFIED` (auth.js comments). I did not trace which routes sit behind `authMiddleware()`.

**NVS version → `src/browse/` — a deliberate non-clone.** I did **not** build fingerprint spoofing, proxy rotation, or cookie-borrowing, and I recommend NVS not offer them: evading a site's access controls is a terms-of-service and, depending on the site and jurisdiction, a legal problem for NVS and for any client who relies on it, and it is hard to defend in a client contract. What I built is the part agents genuinely need: a fetch policy that **identifies itself** (UA must name the tool and a contact URL), **obeys robots.txt** (RFC 9309 matching: longest match, Allow wins ties, `*`/`$`, 5xx = disallow-all), **rate-limits per host**, refuses non-https / credentials-in-URL / odd ports / private, loopback, link-local, reserved, multicast and metadata addresses by CIDR range (including IPv4-mapped IPv6 in both spellings, which the URL parser normalizes), re-checks the resolved IP after DNS and passes that exact address to the fetch implementation so the connection is pinned to it; robots.txt answering 3xx/401/403/5xx is treated as disallow-all, refuses to auto-follow redirects, and on 401/403/429 **refuses instead of working around it**. A refusal comes with the reason and the sanctioned alternative (official API, ask the owner, fetch by hand). The accessibility-snapshot-with-refs idea is worth lifting later (needs a DOM/browser, so not in this package).

## 9. Open-Higgsfield-AI — "open source Higgsfield"

**What it is.** A Next.js/Electron front end (243 files) whose generation goes through a **third-party paid API, muapi.ai** (`src/lib/muapi.js`); it is a client, not a model. The README pitches "no content filters", "600+ models, 14 studios", and a white-label reseller programme ("plans start at $49/mo", "you keep the markup"). `VERIFIED` (muapi client) / `DOCUMENT-STATED` (README)

**Verdict.** The value is the studio UX over someone else's metered API. The "no filters" and resale framing is a liability for an agency: content/likeness risk lands on whoever publishes, and the economics belong to the API vendor.

**NVS version → `src/video/genJob.ts`.** Generation is a **spend action**: cost is computed first (`ceil(seconds × ¢/s)`, refusing NaN), bounded by per-action and daily caps (zero by default), and a human approves the exact prompt and price. A request that depicts a real person must carry a likeness-consent reference or is refused; `public-post` use requires the record be classified PUBLIC (publication is its own approval). Provider-side moderation still applies; this adds NVS's own gate on top.

## 10. HyperFrames — HTML in, deterministic MP4 out

**What it is.** HeyGen's Apache-2.0 bun monorepo: 15 packages (`core`, `engine`, `producer`, `studio`, `cli`, `lint`, `parsers`, `player`, `aws-lambda`, `gcp-cloud-run`, …), roughly 0.8 M lines of TypeScript by my count (includes generated bundles). Compositions are HTML with `data-composition-id`, `data-width/height/duration`, and clips with `data-start`/`data-duration`/`data-track-index`; animations are *seekable* so each frame renders deterministically. 21 agent skills. `VERIFIED` (tree, attribute contract) / `DOCUMENT-STATED` (README)

**Verdict.** Best-engineered of the ten and a poor candidate to rebuild. **Use upstream.**

**NVS version → `src/video/lint.ts`.** A thin pre-render check on the documented attribute contract (missing root, non-positive durations, clips running past the composition, relative starts such as `intro - 0.5` resolved; same-track overlap only a warning because upstream treats `data-track-index` as display-only) so a bad timeline is caught before a render or a paid generation is queued. NVS value-add is the wrapper around upstream, not a fork.

---

## Reading the claim: "make money while you sleep"

Of the ten, only AutoHedge and Vibe-Trading can place trades, and both are tools for *people who already have a strategy and a risk process*; I saw no live-performance evidence in either. The rest are productivity tools. For NVS the sellable thing is not "autonomous income"; it is **governed agent work for clients** — audits, drafts, research, video — with evidence and approvals on every consequential step. That is what `nvs-agent-desk` is built around. Anything touching securities or advice for others needs licensed review and sits outside the NVS lane (see DESIGN.md §Lane boundaries).
