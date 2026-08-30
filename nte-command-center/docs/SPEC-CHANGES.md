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
