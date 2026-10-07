# ⚙️ Scheduled Task Definition — `ST-NTE-004`

| Field           | Value |
|-----------------|-------|
| 🏷️ Task ID      | `ST-NTE-004` |
| 🏷️ Name         | Email Authentication Watch (excellencedistrict.org) |
| 🧑‍💼 Capacity    | `NTE` |
| 📆 Defined      | 2026-10-07 |
| 🔧 Status       | `ACTIVE` |
| 🔗 Routine ID   | `trig_01QBEsHpCMMFRZkJxyePa5NL` |

## 🎯 MISSION

Keep the sending-domain posture of `excellencedistrict.org` known and unbroken: SPF, DKIM, DMARC, MX and NS
must match the values verified on 2026-10-07, and the DMARC aggregate reports arriving at
`khuel@excellencedistrict.org` must show every legitimate sender passing before anyone tightens the DMARC
policy. The task reads and reports. It never changes DNS.

## 🧑‍💼 CAPACITY

`NTE` (Lane A). The domain is the Excellence District's public mail and web identity, served per
`docs/DOMAIN_NETWORK.md`. It is not `OTHER` because the domain belongs to a single Lane A property, and it is not
a network-integrity task in the `ST-OTHER-001` sense, which watches the Executive OS knowledge network.

## ⏰ SCHEDULE / TRIGGER

| Field              | Value |
|--------------------|-------|
| Cadence            | Daily. The DMARC report review step runs on Mondays only. |
| Local time         | 08:17 |
| Timezone           | America/New_York |
| UTC cron           | `17 12 * * *` |
| Condition          | None. |
| Start date         | 2026-10-08 |
| End date           | Open. Review after 30 runs. |
| Exception schedule | The UTC cron is the EDT value; after DST ends 2026-11-01 use `17 13 * * *`. The Routine is stored as `CRON_TZ=America/New_York 17 8 * * *`, so it follows DST. Principal checkpoint on 2026-10-21: consider moving DMARC from `p=none` to `p=quarantine; pct=10` only if the reports are clean. That is a human decision. |

## 📥 INPUTS

- Public DNS over HTTPS: `https://dns.google/resolve?name=<name>&type=<type>` for the five record sets below.
- Gmail connector scoped to `khuel@excellencedistrict.org`, for DMARC aggregate reports (Monday step).
- The previous run's Run Log row in this file.

## 📁 CANONICAL ARTIFACTS

| Artifact | Location | Role (read / update / both) |
|----------|----------|-----------------------------|
| Expected values | **EXPECTED RECORDS** table in this file | read |
| Domain and host registry | `docs/DOMAIN_NETWORK.md` | read |
| Run Log | the bottom of this file | update |

### EXPECTED RECORDS (verified 2026-10-07, `VERIFIED` via Google public DNS)

| Name | Type | Expected |
|------|------|----------|
| `excellencedistrict.org` | TXT (SPF) | `v=spf1 include:_spf.google.com ~all` |
| `google._domainkey.excellencedistrict.org` | TXT | begins `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz7PjGqUIZZl6ilVo3GmP7rywP8yQ` (compare the prefix, then compare the full key against the previous run) |
| `_dmarc.excellencedistrict.org` | TXT | `v=DMARC1; p=none; rua=mailto:khuel@excellencedistrict.org` |
| `excellencedistrict.org` | MX | `1 aspmx.l.google.com`, `5 alt1.aspmx.l.google.com`, `5 alt2.aspmx.l.google.com`, `10 alt3.aspmx.l.google.com`, `10 alt4.aspmx.l.google.com` |
| `excellencedistrict.org` | NS | `nsd1`, `nsd2`, `nsd3`, `nsd4` `.squarespacedns.com` |

Authentication result on 2026-10-07 for a Gmail-to-Gmail test message: SPF pass, DKIM pass
(`d=excellencedistrict.org; s=google`), DMARC pass, as recorded in the message's `Authentication-Results`
header (`DOCUMENT-STATED` by the header, `USER-REPORTED` as supplied by the principal).

## 🔄 PRIOR-RUN CONTINUITY

Read the last Run Log row first. Each run must report: what changed · what closed · what carried · what failed ·
what became irrelevant.

## 🌐 WEB RESEARCH MODE

`QUICK VERIFY`. Record the AS-OF time (UTC) on each run.

## ⚠️ KNOWN CONSTRAINT

The Routine stores **no MCP connectors** (the Routines API refused the `connectors` parameter for this organization),
so its sessions have no Gmail. The daily DNS check works; the Monday DMARC report step reports "skipped: no Gmail
access" until a session that holds Gmail runs it, or the Routine is re-created from the claude.ai Routines UI with the
Gmail connector. The task is genuinely scheduled; it is not fully equipped.

## 🧠 PROCESS

1. Query the five record sets above. Compare each with EXPECTED RECORDS. Ignore ordering and TTL.
2. A record that differs, or that cannot be resolved, is a finding. Retry a failed lookup once before reporting it.
3. **Mondays only:** search Gmail for DMARC aggregate reports from the last 8 days (subjects containing
   `Report domain`, or attachments `.xml.gz` or `.zip`). Per report, record the sending source, message count and
   SPF, DKIM and alignment results. If the connector cannot open attachments, say so and report only the
   senders and counts that the message bodies show.
4. Flag any sending source that is not Google Workspace, and any source with failing alignment. Do not assume an
   unknown source is malicious or legitimate; record it as `UNKNOWN`.
5. Append one Run Log row and end with exactly one final-output status.

## 🔎 RESEARCH QUESTIONS

- **Primary:** Do the SPF, DKIM, DMARC, MX and NS records still match EXPECTED RECORDS?
- **Subquestions:** Has the DKIM key changed? Did any DMARC report arrive this week?
- **Contrary questions:** Is a sender passing only because Google signs for it, while a different source fails?
- **Current-development questions:** Has the DMARC policy or `rua` address changed since the last run?
- **Unknowns requiring verification:** Which third-party systems (portal, CRM, newsletters) send as the domain.

## 🏛️ SOURCE PRIORITY

1. Live DNS answers from Google public DNS (`VERIFIED`).
2. Gmail `Authentication-Results` headers and DMARC aggregate reports (`SYSTEM-RECORDED`).
3. `docs/DOMAIN_NETWORK.md` (`DOCUMENT-STATED`). Where it disagrees with live DNS, live DNS wins and the disagreement is reported.

## ⚔️ RED-TEAM CHECK

What would make "all clear" wrong: a lookup answered from a stale cache; a report that covers only Google-originated mail
and so cannot show a rogue sender; a record that matches by prefix while the DKIM key has changed. Compare the full DKIM key
with the previous run and say when a clean result rests on a single report.

## 🌳 SCENARIOS

N/A. This is a drift check, not a forecast.

## 📊 VISUALS REQUIRED

None until at least four weekly report sets exist. After that, a per-source pass/fail table by week. **Never fabricate visual data.**

## 🖼️ GRAPHICS

NONE.

## 📑 OUTPUT ARTIFACT

`brief`. One short message, and only when the final output is not ✅ NO ACTION REQUIRED.

## 🎨 DISPLAY STANDARD

Default per SPEC v2. Override: keep the message to a table and one sentence; a quiet day sends nothing.

## 🧾 EVIDENCE

Tag every claim `VERIFIED` (DNS answer received this run), `SYSTEM-RECORDED` (report contents), `INFERRED`, or
`UNKNOWN`. A lookup that failed is `UNKNOWN`, never "unchanged".

## ⚖️ CONTRADICTIONS

If DNS and a DMARC report disagree (for example a report shows a sender SPF does not authorize), report both and
do not choose one.

## 🚨 EXCEPTION CONDITIONS

| Condition | Threshold | Escalation |
|-----------|-----------|------------|
| MX or NS differs from expected | Any difference | 🎯 DO NOW. Treat as an incident; mail or the whole zone may be redirected. |
| SPF, DKIM or DMARC record differs or is missing | Any difference | 🎯 DO NOW. State the old and new values. |
| A source other than Google fails DMARC alignment | Any | ⚖️ DECISION REQUIRED. The principal decides whether it is legitimate. |
| Unknown sending source | Any | ⚖️ DECISION REQUIRED. |
| Lookup or Gmail access fails | Two consecutive runs | 🧱 BLOCKED BY. |

## 🛡️ GUARDRAILS

**Prohibited:**
- Changing DNS, DMARC policy or any registrar setting. There is no code path for it.
- Sending, replying to, forwarding, labeling or deleting any email. Read only.
- Reproducing a DKIM or report payload beyond what the Run Log needs.

**Requires human approval:**
- Any DMARC policy change (`quarantine`, `reject`, `pct`), which must be entered by the principal at the DNS host.
- Adding or removing a sending source from SPF.

## 📌 PROOF REQUIRED

The Run Log row names the AS-OF time, the five lookups with their results, and, on Mondays, the number of DMARC
reports read (or the reason none were).

## 🔄 STATE UPDATE

The Run Log below. Nothing else is written.

## 🤝 HANDOFF

The principal reads the final-output line. `docs/DOMAIN_NETWORK.md` is updated by a human when a record is
intentionally changed.

## 📏 SUCCESS METRIC

Time between an unintended DNS change and the principal knowing about it (target: under 24 hours), and whether the
2026-10-21 DMARC decision was made on report evidence instead of a guess.

## 🛑 KILL / MERGE RULE

| Action     | Trigger |
|------------|---------|
| MERGED     | A broader domain-integrity task already covers these records. |
| REDUCED    | DMARC reports confirm a stable sender set: drop the daily DNS step to weekly. |
| PAUSED     | The domain moves to a different DNS provider until EXPECTED RECORDS is rewritten. |
| REPLACED   | A registrar-level alerting service takes over. |
| TERMINATED | The domain is retired. |

## 💡 SCALE CHECK

Review after 30 runs:

- [ ] Can this become an SOP?
- [ ] Can it be delegated?
- [ ] Can it be automated further?
- [ ] Should it stop?

## ✅ FINAL OUTPUT

🎯 DO NOW · ⚖️ DECISION REQUIRED · ⏳ WAITING ON · 🧱 BLOCKED BY · ✅ NO ACTION REQUIRED.
When nothing differs and no new report needs a decision, the answer is ✅ NO ACTION REQUIRED, with no notification.

---

## 🗒️ Run Log

| Run date (AS-OF) | Final output | Changed / closed / carried / failed / irrelevant | Proof | Notes |
|------------------|--------------|--------------------------------------------------|-------|-------|
| 2026-10-07 | ✅ NO ACTION REQUIRED | Baseline. All five record sets match EXPECTED RECORDS. No DMARC reports yet (record went live 2026-10-07). | Google DNS-over-HTTPS lookups; Gmail search of last 14 days returned nothing | Defined by Claude Code; first scheduled run 2026-10-08. |
