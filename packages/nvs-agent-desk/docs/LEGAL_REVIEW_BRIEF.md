# Legal review brief — agent browsing and bot-detection evasion

**DRAFT for counsel. Not legal advice. Not sent to anyone.** Prepared for Chief Ransom, NTE Virtual Solutions (NVS), 2026-10-21.
Decision recorded: *legal review first* — no evasion capability is built until counsel answers below.

## Why this is being asked
The upstream project `jo-inc/camofox-browser` (MIT) is built to defeat bot detection: browser-fingerprint spoofing, residential-proxy routing, imported login cookies. NVS wants agents that can browse for clients. The current NVS module (`src/browse`) does the opposite: honest user agent, robots.txt, rate limit, no private addresses, refuses on 401/403/429.

## Questions for counsel
1. If NVS (or a client) uses fingerprint spoofing or proxy rotation to access a site that has chosen to block automated clients, what exposure arises under: the Computer Fraud and Abuse Act (18 U.S.C. §1030) as narrowed by *Van Buren v. United States* (2021); state computer-crime statutes; contract (site terms); and anti-circumvention law (DMCA §1201)? Does *hiQ Labs v. LinkedIn* (9th Cir.) help for public pages, and does it travel to our jurisdictions?
2. Does the answer differ for: public pages vs. pages behind a login; a client's own accounts (client-authorised) vs. third-party data; read-only vs. interaction?
3. Personal data in scraped pages: GDPR/UK GDPR, CCPA/CPRA, and sector rules. Who is controller/processor between NVS and a client?
4. Contract posture: what must the NVS client agreement say (scope of authorised access, indemnity, no-evasion clause, audit rights, takedown)?
5. Insurance: does NVS's coverage (E&O/cyber) exclude intentional circumvention?
6. Is there a safe middle: official APIs, licensed data, explicit site permission, or client-owned accounts with documented consent?

## Evidence to give counsel
- Upstream README claims it "bypasses Google, Cloudflare, and most bot detection" (document-stated; not tested by us).
- Upstream sends crash telemetry to a vendor endpoint by default (verified in `lib/reporter.js`).
- NVS's current refusal behaviour: `packages/nvs-agent-desk/src/browse/`, with tests.

## Interim rule (in force now)
No evasion code is added. If a site refuses automated access, the agent reports the refusal and the sanctioned alternatives. Reopen only on written counsel advice and the principal's authorization for that exact capability.
