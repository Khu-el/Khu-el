# ADR-0002 — Connecting the control plane to the systems of record

> **Status:** 🔄 ACCEPTED · **Date:** 2026-09-11
> **Lane:** `LANE_A` · **Entity:** NTE · **Capacity:** Minister / Authorized Representative
> **Risk tier:** R0 reads, R1 local writes
> **Builds on:** ADR-0001

---

## 🎯 Context

ADR-0001 left the bus as a static snapshot. Six connectors had been verified live
once, and that fact was written into a committed registry — where it would age
silently and eventually become a confident lie. The control plane needed a way to
read live state and, more importantly, a way to **know when it had stopped**.

---

## 🧭 Decisions

### 1. The kernel never holds a credential and never opens a socket

The runtime performs the read; the kernel validates, records and tracks it. This
split is not squeamishness. It is what lets the kernel run on a fresh clone with
nothing configured, and it is the only way a control plane can live in a public
repository at all: there is no token to leak because there is no token.

### 2. Verification expires

Every connector declares a freshness budget, chosen from how fast that system
actually changes — a task ledger moves hourly, a document store daily, an
identity barely at all. Past the budget a reading is `STALE`. A connector never
read is `NEVER_OBSERVED`, not healthy. **A failed reading is never `FRESH`,
however recent** — a connector that just told us it is broken is not in good
standing.

Freshness is computed at runtime from `live/`, never read from a committed field,
because a stored date ages without telling anyone.

### 3. Identifying material has exactly one home

An observation splits into `metrics` (counts and states) and `detail` (anything
identifying). `detail` lives only in `.neterverse/live/`, which is gitignored. The
committed record of a sync is the **event**, which carries the summary and never
the detail. Even `metrics` stay out of committed projections — non-identifying by
intent is not a guarantee worth making in a public repository.

### 4. The public-repo boundary is now a check, not a memory

`npm run bus -- audit` scans committed bus state for emails, Drive-style
identifiers, workspace numbers, UUIDs, tokens and key blocks. During the first
build this boundary was held by reading the diff, which does not scale and nearly
failed once. Its rules were tightened against real bus state until the only things
it flags are genuine external identifiers — a rule that fires on every correlation
id gets switched off, and then it protects nothing.

---

## ⚖️ Consequences

**Gained:** the bus reports live state and, crucially, reports its own staleness.
A reader can tell the difference between "checked minutes ago" and "checked
yesterday" without asking anyone.

**Cost:** syncs must actually be run. Nothing here polls. That is deliberate —
an automatic poller would need stored credentials, which is the thing this design
refuses.

**Not done:** no connector was written to. Every reading was read-only, and no
write path exists for any of them. Sending, publishing and filing remain R3 and
absent from the code.

**Reversibility:** additive. Deleting the three new modules and `live/` returns
the kernel to its ADR-0001 state.
