import test from 'node:test';
import assert from 'node:assert/strict';
import { newRef, refPerContent } from '../src/logic/ids.ts';

test('ids: keys are v4 UUIDs and differ', () => {
  const a = newRef();
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a, newRef());
});

test('ids: the same content keeps its key across retries; edited content gets a new one', () => {
  const refFor = refPerContent();
  const first = refFor('["Launch my store","Plan","2026-10-04"]');
  assert.equal(refFor('["Launch my store","Plan","2026-10-04"]'), first);
  const edited = refFor('["Launch my shop","Plan","2026-10-04"]');
  assert.notEqual(edited, first);
  // Going back to the original wording is a new submission, not the first one.
  assert.notEqual(refFor('["Launch my store","Plan","2026-10-04"]'), first);
});
