/**
 * The record cache is per account, not per browser.
 *
 * Before this, every account signing in on one machine shared a key like
 * "nte-deal-architect:deals". Sign-out clears the token but not the cache, so
 * the next person to sign in mounted the app against the previous person's
 * records. Three of the four apps are private per owner, so those were records
 * the second account had no right to read.
 *
 * These are plain functions over a Storage-shaped object, so the suite runs
 * under `node --test` with no DOM.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { foreignCacheKeys, purgeForeignCaches, scopedCacheKey } from '../src/api/cacheKey.ts';

/** Enough of the Storage interface for these helpers, plus a throwing mode. */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  throwOnRemove = false;
  throwOnRead = false;

  constructor(entries: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(entries)) this.map.set(k, v);
  }
  get length() {
    if (this.throwOnRead) throw new Error('storage unavailable');
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    if (this.throwOnRemove) throw new Error('read-only storage');
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
  keys() {
    return [...this.map.keys()];
  }
  [name: string]: any;
}

const DEALS = 'nte-deal-architect:deals';

describe('scopedCacheKey', () => {
  test('two accounts get two different keys', () => {
    assert.notEqual(scopedCacheKey(DEALS, 'user_a'), scopedCacheKey(DEALS, 'user_b'));
  });

  test('the same account gets the same key every time', () => {
    assert.equal(scopedCacheKey(DEALS, 'user_a'), scopedCacheKey(DEALS, 'user_a'));
  });

  test('the key still names its app, so it stays legible in devtools', () => {
    assert.ok(scopedCacheKey(DEALS, 'user_a').startsWith(DEALS));
  });

  test('different apps stay separate for one account', () => {
    assert.notEqual(
      scopedCacheKey(DEALS, 'user_a'),
      scopedCacheKey('ccrlt-legacy-estate:estates', 'user_a')
    );
  });
});

describe('foreignCacheKeys', () => {
  test("finds another account's cache but not our own", () => {
    const storage = new FakeStorage({
      [scopedCacheKey(DEALS, 'user_a')]: '[]',
      [scopedCacheKey(DEALS, 'user_b')]: '[]',
    });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a'), [scopedCacheKey(DEALS, 'user_b')]);
  });

  test('treats the old unscoped key as foreign, because it was shared by everyone', () => {
    const storage = new FakeStorage({ [DEALS]: '[]' });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a'), [DEALS]);
  });

  test('leaves other apps alone', () => {
    const storage = new FakeStorage({
      [scopedCacheKey('ccrlt-legacy-estate:estates', 'user_b')]: '[]',
      [scopedCacheKey(DEALS, 'user_b')]: '[]',
    });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a'), [scopedCacheKey(DEALS, 'user_b')]);
  });

  test('leaves unrelated keys alone', () => {
    const storage = new FakeStorage({ 'some-other-app': '[]', 'nte-deal-architect:ui-prefs': '{}' });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a'), []);
  });

  test('is not confused by a key that merely starts with the cache name', () => {
    // "…:dealsX" is a different cache, not this one scoped to somebody.
    const storage = new FakeStorage({ [`${DEALS}X`]: '[]', [`${DEALS}-archive`]: '[]' });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a'), []);
  });

  test('finds several foreign caches at once', () => {
    const storage = new FakeStorage({
      [DEALS]: '[]',
      [scopedCacheKey(DEALS, 'user_b')]: '[]',
      [scopedCacheKey(DEALS, 'user_c')]: '[]',
      [scopedCacheKey(DEALS, 'user_a')]: '[]',
    });
    assert.deepEqual(foreignCacheKeys(storage, DEALS, 'user_a').sort(), [
      DEALS,
      scopedCacheKey(DEALS, 'user_b'),
      scopedCacheKey(DEALS, 'user_c'),
    ].sort());
  });
});

describe('purgeForeignCaches', () => {
  test("removes the other account's records and keeps ours", () => {
    const mine = scopedCacheKey(DEALS, 'user_a');
    const theirs = scopedCacheKey(DEALS, 'user_b');
    const storage = new FakeStorage({ [mine]: '[{"id":"mine"}]', [theirs]: '[{"id":"theirs"}]' });

    const removed = purgeForeignCaches(storage, DEALS, 'user_a');

    assert.deepEqual(removed, [theirs]);
    assert.equal(storage.getItem(theirs), null);
    assert.equal(storage.getItem(mine), '[{"id":"mine"}]');
  });

  test('retires the old shared key', () => {
    const storage = new FakeStorage({ [DEALS]: '[{"id":"from-an-older-build"}]' });
    purgeForeignCaches(storage, DEALS, 'user_a');
    assert.equal(storage.getItem(DEALS), null);
  });

  test('leaves every other app untouched', () => {
    const estates = scopedCacheKey('ccrlt-legacy-estate:estates', 'user_b');
    const storage = new FakeStorage({ [estates]: '[]', 'unrelated': 'x' });
    purgeForeignCaches(storage, DEALS, 'user_a');
    assert.equal(storage.getItem(estates), '[]');
    assert.equal(storage.getItem('unrelated'), 'x');
  });

  test('is a no-op on a clean browser', () => {
    const storage = new FakeStorage();
    assert.deepEqual(purgeForeignCaches(storage, DEALS, 'user_a'), []);
  });

  test('survives storage that cannot be read', () => {
    // A private window can throw on access. Failing to tidy up must never stop
    // the app from loading.
    const storage = new FakeStorage({ [DEALS]: '[]' });
    storage.throwOnRead = true;
    assert.deepEqual(purgeForeignCaches(storage, DEALS, 'user_a'), []);
  });

  test('survives storage that refuses writes', () => {
    const storage = new FakeStorage({ [DEALS]: '[]' });
    storage.throwOnRemove = true;
    assert.deepEqual(purgeForeignCaches(storage, DEALS, 'user_a'), []);
    assert.equal(storage.getItem(DEALS), '[]', 'the entry stays, but nothing throws');
  });

  test('the whole scenario: B signs in after A on the same browser', () => {
    const storage = new FakeStorage();

    // A uses the app; their records are cached.
    storage.setItem(scopedCacheKey(DEALS, 'user_a'), '[{"id":"a-private-deal"}]');

    // A signs out -- the token goes, the cache does not.
    // B signs in and the app opens its cache.
    purgeForeignCaches(storage, DEALS, 'user_b');
    const bSees = storage.getItem(scopedCacheKey(DEALS, 'user_b'));

    assert.equal(bSees, null, "B starts empty rather than holding A's records");
    assert.equal(storage.getItem(scopedCacheKey(DEALS, 'user_a')), null, "and A's copy is gone from the shared machine");
  });
});
