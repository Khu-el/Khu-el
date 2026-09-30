/**
 * A record the user was told was saved must not disappear on the next refresh.
 *
 * useSyncedRecords used to replace local state with the server's list on every
 * refresh. A record added or edited while the server was unreachable was
 * therefore thrown away the moment the server came back -- after the caption
 * had said "saved locally". These cover the rule that keeps it.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isTransientFailure, mergeServerWithPending } from '../src/api/pendingSync.ts';

const rec = (id: string, v: string) => ({ id, v });

describe('mergeServerWithPending', () => {
  test('with nothing pending, the server list is the answer', () => {
    const server = [rec('a', 'server')];
    assert.deepEqual(mergeServerWithPending(server, [rec('a', 'local'), rec('b', 'stale')], {}), server);
  });

  test('a record created offline and never synced is kept', () => {
    const merged = mergeServerWithPending([rec('a', 's')], [rec('new', 'offline'), rec('a', 's')], { new: true });
    assert.deepEqual(merged, [rec('new', 'offline'), rec('a', 's')]);
  });

  test("a pending edit wins over the server's older copy", () => {
    const merged = mergeServerWithPending([rec('a', 'server-old')], [rec('a', 'local-new')], { a: true });
    assert.deepEqual(merged, [rec('a', 'local-new')]);
  });

  test('a local record that is not pending does not survive a record the server deleted', () => {
    const merged = mergeServerWithPending([], [rec('gone', 'local')], {});
    assert.deepEqual(merged, []);
  });

  test('a pending id with no local record behind it adds nothing', () => {
    assert.deepEqual(mergeServerWithPending([rec('a', 's')], [], { ghost: true }), [rec('a', 's')]);
  });
});

describe('isTransientFailure', () => {
  test('no response at all (fetch rejects with a TypeError) is transient', () => {
    assert.equal(isTransientFailure(new TypeError('Failed to fetch')), true);
  });

  test('a 5xx is transient', () => {
    assert.equal(isTransientFailure({ status: 503 }), true);
  });

  test('a 4xx is the server refusing, and is not retried', () => {
    for (const status of [400, 403, 404, 409]) assert.equal(isTransientFailure({ status }), false, String(status));
  });
});
