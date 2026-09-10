# `@nte/neterverse-kernel`

The shared-state kernel behind `.neterverse/` — the collaboration bus two
runtimes use to work this ecosystem without losing state or crossing a boundary.

**Zero dependencies. No build step.** Node 22.6+ executes the TypeScript
directly, so the kernel and its tests run on a fresh clone before `npm install`
has ever happened. That is deliberate: validating shared state must not depend
on a successful install.

```bash
npm test                         # from the repo root
node src/cli.ts status           # or npm run bus -- status
```

---

## What each module is for

| Module | Responsibility |
|---|---|
| `types.ts` | Vocabulary, mirrored from `@nte/governance-core` rather than reinvented |
| `validate.ts` | Dependency-free validator for the JSON Schema subset the bus uses |
| `lane.ts` | The lane firewall — Lane A and Lane B do not merge |
| `risk.ts` | Risk tiers and the approval boundary |
| `bus.ts` | Bus layout and the append-only event log |
| `leases.ts` | Task leases, so two runtimes never write the same resource |
| `registries.ts` | Loading and validating `.neterverse/state/` |
| `cli.ts` | `status`, `events`, `leases`, `lease`, `validate`, `log` |

---

## Four behaviours worth knowing before you use it

**Cross-lane operations throw by default.** `assertLaneCompatible()` passes only
on a same-lane operation, or with a bridge naming that exact pair *and* carrying
an authority reference. `UNCLASSIFIED` is not an exemption.

```ts
assertLaneCompatible('LANE_B', 'LANE_A');            // throws LaneFirewallError
assertLaneCompatible('LANE_B', 'LANE_A', bridge);    // passes, if the bridge matches
```

**The approval boundary has two triggers.** Tier R3 and above stops for a human,
and so does any action on the human-only list whatever tier it was given —
because mis-tiering is the likeliest failure.

```ts
requiresHumanApproval('draft_code', 'R1');  // false
requiresHumanApproval('send', 'R1');        // true — a send is a send
```

**The event log cannot be rewritten.** There is `appendEvent` and
`appendCorrection`, and nothing else. An invalid event is rejected before it
reaches the file, so the log never holds a record that fails its own schema.

**A denied lease is an instruction, not an obstacle.** When `acquireLease`
returns `{ ok: false }` it names the holder and the overlapping resources. The
correct response is to read that agent's handoff and take non-conflicting work.
Leases expire so a dead runtime cannot hold a resource forever.

---

## Testing

43 tests, covering the denied paths rather than only the happy ones: crossing a
lane without a bridge, a bridge for the wrong pair, a bridge with no authority, a
human-only action mis-tiered as R0, an R3 action under a permissive ceiling,
overlapping lease claims, an expired lease, an event with an invented kind, an
event carrying an unknown field, and a schema keyword the validator does not
support.
