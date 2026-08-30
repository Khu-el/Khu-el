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
