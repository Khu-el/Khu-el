/**
 * Record caches are per user, not per app.
 *
 * `useSyncedRecords` mirrors the server's records into localStorage so the app
 * still renders offline. The cache key used to be a fixed string per app, e.g.
 * "nte-deal-architect:deals", shared by everyone who signs in on that browser.
 *
 * On a shared machine that leaked records between accounts. Sign-out clears the
 * token and the user but not the cache, so the next person to sign in mounted
 * the app against the previous person's records and saw them render -- and if
 * the server was unreachable, kept seeing them under the caption "showing your
 * last saved copy". Three of the four apps are private per owner, so those were
 * records the second account has no right to read.
 *
 * These helpers are plain functions over a Storage-shaped object so they can be
 * tested without a DOM.
 */

/** Marks the boundary between an app's cache name and the account it belongs to. */
const OWNER_SEPARATOR = '::user:';

/**
 * The key a given account's cache lives under. Two accounts on one browser get
 * two caches and never read each other's.
 */
export function scopedCacheKey(cacheKey: string, userId: string): string {
  return `${cacheKey}${OWNER_SEPARATOR}${userId}`;
}

/**
 * Every key belonging to this cache but to some other account.
 *
 * The unscoped key is included: a browser that used an older build still holds
 * one, and it is exactly the shared cache this scoping exists to retire.
 */
export function foreignCacheKeys(storage: Pick<Storage, 'length' | 'key'>, cacheKey: string, userId: string): string[] {
  const mine = scopedCacheKey(cacheKey, userId);
  const found: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null || key === mine) continue;
    if (key === cacheKey || key.startsWith(`${cacheKey}${OWNER_SEPARATOR}`)) found.push(key);
  }
  return found;
}

/**
 * Drops those caches. Called when a cache is opened, so another account's
 * records do not sit on the disk of a shared machine indefinitely, and so the
 * keys do not accumulate one per account forever.
 *
 * Returns what it removed. Never throws: storage can be unavailable or
 * read-only in a private window, and failing to tidy up must not stop the app
 * from loading.
 */
export function purgeForeignCaches(storage: Storage, cacheKey: string, userId: string): string[] {
  let stale: string[];
  try {
    stale = foreignCacheKeys(storage, cacheKey, userId);
  } catch {
    return [];
  }
  const removed: string[] = [];
  for (const key of stale) {
    try {
      storage.removeItem(key);
      removed.push(key);
    } catch {
      // Read-only storage; leave it and carry on.
    }
  }
  return removed;
}
