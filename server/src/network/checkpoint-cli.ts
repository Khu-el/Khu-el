/**
 * Verify local ledger checkpoints. Prints counts and match results.
 * Does not print record bodies.
 */
import { db } from '../lib/db.js';
import { verifyOwner } from './checkpoint.js';

const owners = db.prepare('SELECT DISTINCT owner_id AS ownerId FROM network_events').all() as { ownerId: string }[];
if (owners.length === 0) {
  console.log(JSON.stringify({ owners: 0, chainIntact: true, anchored: false }));
  process.exit(0);
}

let failed = false;
const reports = owners.map((owner) => {
  const result = verifyOwner(owner.ownerId);
  if (!result.chainIntact || (result.anchored && !result.matches)) failed = true;
  return {
    ownerPrefix: owner.ownerId.slice(0, 8),
    chainIntact: result.chainIntact,
    anchored: result.anchored,
    matches: result.matches,
    count: result.count,
    checkpoints: result.checkpoints,
    reason: result.reason,
  };
});
console.log(JSON.stringify({ owners: reports.length, reports }));
process.exit(failed ? 1 : 0);
