# Spec changes

The build order says: where a step conflicts with the spec, the spec wins; and
where the spec is wrong, change the spec first and say what changed. The gap
between a document and the thing it describes is where the next false
"cleared" comes from, so every divergence is written down here rather than
left implicit in the code.

---

## SC-01 · A module may declare a freeze-exempt part

**Changed** `docs/ARCHITECTURE.md` (module contract), `docs/MODULE-SPECS.md`
§ 05 and § 02.

**The conflict.** § 05 says the security hold "renders at the top of the
module, above everything, in the alert treatment, until it carries a `proof`
of remediation" and "outranks the whole board." § 05 also declares
`buildWork: true`, and the Build Freeze Rule locks every `buildWork: true`
module below 40 contacts. Taken together, an open plaintext credential file in
a synced vault would become invisible in exactly the weeks the operator is
furthest behind. A hold that disappears is worse than no hold: it reads as
resolved.

§ 02 has the same shape and says so out loud — "Whole module locks under the
build freeze except the plans board, which stays readable (reading a plan is
not build work)" — so the spec already needed the mechanism and only named it
in one place.

**The change.** `ModuleDefinition` gains an optional `FreezeExempt` component.
When the freeze locks a module, `ModuleBody` renders `FreezeExempt` above the
freeze stamp and nothing else. Everything that is build work still locks.

This is not a bypass and it is not a setting. There is no flag that unlocks a
module, no dev-mode escape, and no way for a module to declare itself exempt
in full — `FreezeExempt` is a second component, so a module has to say
specifically which part stays readable, in code, in review.

**Used by** module 05 (the security hold) and module 02 (the plans board).

---

## SC-02 · `ProofForm` moved into the shared component set

**Changed** nothing in the specs; recorded here because it changes the shape
modules copy.

Module 10 carried a local `ProofForm`. Modules 05, 09 and 11 need the same
control, and four copies of an evidence gate is four places for one of them to
drift into accepting an empty source. It now lives in `src/ui/components.tsx`
alongside `ProofLine`, and module 10 imports it like everyone else.

---

## SC-03 · The contact counter is held across surfaces, not per surface

**Changed** `docs/ARCHITECTURE.md` (data flow), `CLAUDE.md` § 4 and § 7.

**The conflict.** Storage namespaces every key by surface, and the comment on
`src/core/storage.ts` says so as a firewall guarantee. But the Build Freeze
Rule is one rule across the whole portfolio, and § 04 acceptance requires that
"the contact meter on both instances reads the same underlying count." Under
strict per-surface namespacing, a week at 12 contacts on Lane A is a week at 0
on the practice surface and a fresh 40 to log on each — and switching surfaces
resets the counter. That is a bypass, and a gate with a bypass is not a gate.

**The change.** `src/core/storage.ts` holds a `CROSS_SURFACE` set with exactly
one member, `build-freeze`, written under `ccenter:shared:` rather than
`ccenter:<surface>:`. Everything else is still namespaced and still opaque
across surfaces — the enforcement test proving a Lane A key is unreadable from
Lane B is unchanged and still passes.

What crosses is a Monday date and an integer. No record, no name, no
vocabulary, nothing either surface could read the other's content from. Adding
a second member to that set is a firewall change and gets the same scrutiny.

---

## SC-04 · Blocked terms match on word boundaries

**Changed** `scripts/check-lanes.mjs` and `src/core/lane-guard.ts`, which now
apply the same rule.

**The conflict.** Both halves of the firewall matched blocked terms as
case-insensitive substrings. "NTE" is a substring of *interface*, *documented*,
*content*, *counted* and *intention*; "lane" is a substring of *plane* and
*planetary*. Module 06 could not declare a TypeScript `interface` or say
"documented contact" without tripping the scan.

That is not a tighter firewall. It is a scanner that pushes authors into worse
copy or into suppressing the check — and the build order is explicit that a
failing check means the code is wrong, so an over-firing check corrupts the one
signal that is supposed to be trustworthy.

**The change.** Terms match with an alphanumeric boundary on each side:
`(?<![A-Za-z0-9])term(?![A-Za-z0-9])`, case-insensitive. Alphanumeric rather
than `\b` so a document code still matches on its hyphen
(`NTE-GOV-2026-MASTERPLAY-001` fires) and a term carrying dots still matches at
all (`H.O.P.E. Dealers` fires).

**This is not an exemption.** Nothing was added to either script's `EXEMPT`
list; both lists are byte-identical to the delivered scaffold. Every term still
fires wherever it is used as a term, and `tests/practice-desk.test.tsx` asserts
both directions — every blocked term fires on a real use, and none fires on the
ordinary English words that contain it.

The same commit **tightens** the scan in the other direction: comments were
exempt everywhere, and are now scanned on the practice surface, because
comments reach the bundle and the rule for that surface is that the vocabulary
does not appear in the file at all.

---

## SC-05 · "Under practice" means any path component that names it

**Changed** `scripts/check-lanes.mjs` and `src/core/lane-guard.ts`.

**The conflict.** The delivered detector treated a file as practice source only
when its path contained `/surfaces/practice/` or `/practice-`. Step 7 of the
build order names the module 04 seed files `seed/marketing-lane-a.json` and
`seed/marketing-practice.json`. Under the old rule the second one matched
neither pattern — a practice-surface data file that no firewall check ever
looked at, in the one module whose whole risk is the two surfaces meeting.

**The change.** A file is practice source when any component of its path
contains "practice", case-insensitively. That covers `surfaces/practice/`,
`modules/practice-desk/`, `practice-instance.tsx` and
`marketing-practice.json`, and it is the rule both halves of the firewall now
apply. `isPracticePath` is exported and asserted directly in
`tests/marketing-content.test.tsx`.

The spec's filenames were kept; the detector was the thing that was wrong.
Nothing was added to either `EXEMPT` list.

---

## SC-06 · `network-scan.json` no longer carries the pattern names

**Changed** `scripts/check-network.mjs`.

**The conflict.** The generated scan result listed the patterns it searched
for — `fetch()`, `XMLHttpRequest`, `sendBeacon` and the rest — as data. Module
05 imports that file, so those strings were inlined into the single-file
build, and `check:bundle` correctly flagged the shipped output as containing
three request-capable calls.

It was a false positive, but the check was not wrong to fire: a scanner that
learns to ignore the literal string `fetch(` in a bundle is a scanner that will
one day ignore a real one. Adding the file to an allowlist would have traded a
real guarantee for a cosmetic one.

**The change.** The field is gone. Nothing in the app ever read it, and data
nothing reads should not be in the bundle. The scan result now carries
`patternsDefinedIn: 'scripts/check-network.mjs'` — a path rather than a list of
API names. The patterns still live in the script, which is where they are used.

---

## SC-07 · One copy of the firewall terms, and one copy of the network matchers

**Changed** `src/core/lane-guard.ts`, `scripts/check-lanes.mjs`,
`scripts/check-network.mjs`, `scripts/check-bundle.mjs`; adds
`src/core/firewall-terms.mjs` and `scripts/network-patterns.mjs`.

**Raised by** review on PR #4, and it corrects an overclaim in SC-04.

**The conflict.** SC-04 said both halves of the firewall apply the same rule.
That was true of the matcher and **false of the term lists**.
`scripts/check-lanes.mjs` carried its own `ENTERPRISE` array, and it omitted
`PMA`, `Lane A`, `Lane B` and `lane`. Confirmed by probe: a file under
`src/modules/practice-desk/` containing all three of those terms reported
**"Lane firewall: clear."** and was then blocked by `guardText` at render. A
firewall that answers a question it did not ask is worse than no firewall.

Three holes in the network gates, each confirmed the same way before fixing:

| Hole | Probe result before the fix |
|---|---|
| The local-host exemption was a prefix, so any hostname *starting* with `localhost` was exempt | `http://localhost.evil.example/collect` → "External origins: none" |
| Scheme-relative URLs carry no `http`, so no pattern saw them | `//evil.example/beacon.js` → "External origins: none" |
| The built-output inert list matched by prefix, vouching for every URL under an accounted host | `url(https://reactjs.org/pixel)` would pass with no request-capable call |

**The change.** The term lists, the matcher and the practice-path rule live in
`src/core/firewall-terms.mjs`; the URL matchers live in
`scripts/network-patterns.mjs`. Each is imported by both halves, and tests
assert the halves agree. The inert list is now keyed by **exact URL**, a URL
inside a CSS `url()` is a finding whatever the string is, and scheme-relative
URLs are matched in source, in the bundle and in HTML attributes.

**Both shared modules are `.mjs` on purpose.** The scans read
`.ts/.tsx/.json/.css/.html`, so a terms list in any of those would flag itself
and need an exemption. **Neither guard script's `EXEMPT` list has been
touched**; both are identical to the delivered scaffold.

**One narrowing, stated plainly.** `lane` is a blocked word and also the stem
of this codebase's own surface identifiers — `Surface` is
`'lane-a' | 'lane-b' | 'practice'`, and the guard lives in `lane-guard.ts`. The
term now matches prose and not those three identifiers. A test asserts the
narrowing is narrow: `lane-c` and `lane-guardian` still fire, as do the prose
spellings `Lane A` and `Lane B`.

---

## SC-08 · The week key is local, not UTC

**Changed** `src/core/build-freeze.ts`, `tests/helpers.tsx`.

**Raised by** review on PR #4.

`mondayOf` mixed local and UTC: `getDay()` and `setDate()` are local,
`toISOString()` is not. West of Greenwich the key moved forward from the
evening onwards; east of it, early morning moved the key back a week. Either
way, contacts logged inside one local week landed under two keys, the week's
count appeared to reset, and **the freeze could be cleared twice in one week** —
a bypass of the one rule this console is built around.

Reproduced in `America/New_York` before fixing: Monday 09:00 gave `2026-09-14`,
Monday 21:00 gave `2026-09-15`.

The key is now formatted from local calendar fields. `tests/helpers.tsx` had
its own copy of the same calculation carrying the same bug, which is why no
existing test caught it — the helper and the module agreed while both were
wrong. It now calls `mondayOf`. The suite passes in `UTC`,
`America/New_York`, `Asia/Kolkata` and `Pacific/Kiritimati`.

---

## SC-09 · The Drive file identifier is not committed to a public repository

**Changed** `seed/tech-stack.json`, `docs/MODULE-SPECS.md`; adds
`scripts/check-public.mjs` and `npm run check:public`.

**Raised by** this build, on reading the root `CLAUDE.md` that arrived with the
merge of `main`. It is explicit: *this repository is public*, and an account,
workspace or file identifier must never be committed.

Module 05's file-ID collision defect carried the literal Google Drive
identifier, and `docs/MODULE-SPECS.md` § 05 repeated it. A Drive id is close to
a capability — where a file is shared to anyone with the link, the identifier
*is* the credential — and the defect reads perfectly well without it.

The root `npm run bus -- audit` enforces the same boundary but walks only the
committed bus directories under `.neterverse/`, so it never reaches this
project. Confirmed by reading `audit.ts`, not inferred from its description.
Nothing was checking this project, which is why this sat in a public repository
through two reviews.

**The change.** The identifier is replaced by the label `DRIVE-ID-1` in both
places, and the defect states that the identifier is held outside the
repository. `scripts/check-public.mjs` now fails on an opaque identifier — a
long token mixing cases with digits or underscores, which is what a Drive,
calendar or account id looks like and what neither English nor a document code
looks like — or on an email address. It runs in `npm run check` and in CI.
Verified both ways: it found exactly the two occurrences and nothing else, and
reports clean now they are gone.

---

## SC-10 · The dependency graph is derived, and a condition cannot clear early

**Changed** `src/modules/compliance-cp/index.tsx`; adds
`src/modules/compliance-cp/edges.ts`.

**Raised by** review on PR #4. Two defects, both confirmed against the
delivered seed first.

`dependsOn` and `blocks` describe the same edge from opposite ends, and **nine
edges in the delivered seed are recorded in one direction only**. The panel
rendered each row's `dependsOn` as "waits on …", so a condition another row
blocks rendered as waiting on nothing — the false-cleared shape this register
exists to prevent. The graph is now derived from both directions and the union
governs, which is not inventing data: both arrays are statements about the same
edge set. The asymmetry is still reported on the panel, because a register that
disagrees with itself is a finding about the register, and it is not
reconciled here.

`clearCondition` set `cleared: true` the moment a proof arrived, without
consulting `dependsOn` at all. Q-05 could clear while Q-01, which it waits on,
was still open. The proof requirement stops an unevidenced clear; it did not
stop an out-of-order one. Clearing is now refused while any derived blocker is
open, the refusal names the blocker, and the proof control is disabled on a
blocked row.

---

## SC-11 · Three controls that reported a state they had not reached

**Changed** `src/modules/practice-desk/index.tsx`,
`src/modules/ventures-revenue/index.tsx`,
`src/modules/knowledge-canon/index.tsx`, `seed/practice-desk.json`,
`src/core/storage.ts` and every module that reads stored state.

**Raised by** review on PR #4.

**The outside business activity gate opened on any response.** It read
`Boolean(proof)`, so recording a *denial* cleared the blocking alert and the row
read SUBMITTED · RESPONSE ON FILE. A refusal is not an approval. The recorded
response now carries a disposition — approved, denied, or more information
requested — and only an approval opens the gate. A response cannot be recorded
without one.

**Fifty-one records without a document code were entering a register.** The root
`CLAUDE.md` and § 06 of this console's own rules both say a record without a
`docCode` does not enter a register. The panel now reports zero register
entries and renders the rows as slots awaiting registration, marked as such.

**A recovery action said "Run" and did nothing.** The control had no handler, so
once the doctrine pass completed it became enabled and a click did nothing —
which an operator reads as a failed recovery. This console records that work
happened; it does not perform recovery. The control now opens the same proof
form every other outcome goes through, and the row shows RECORDED with its
proof afterwards.

**A malformed stored value bricked a module permanently.** `load` parsed JSON
and cast the result, so a syntactically valid value of the wrong shape threw on
first render. That is worse than an ordinary crash here: the stored value wins
after first load, and `Reset to seed` lives inside the module that will not
render, so the module stayed dead on every reload with no path back short of
developer tools. `load` now takes an optional shape check, `hasShape` is in
`src/core/storage.ts`, and all nine stateful modules pass the keys they read.
