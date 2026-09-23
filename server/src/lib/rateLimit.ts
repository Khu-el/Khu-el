/**
 * Counts failures per key in a fixed window, and refuses a key that has
 * failed too often until its window ends.
 *
 * Login had no limit at all, so a password could be guessed as fast as bcrypt
 * would answer. This is deliberately small and in-memory: the backend is a
 * single process on one machine (see fly.toml), so there is nothing to share
 * state with, and adding a dependency for it would add more than it removes.
 * A restart clears the counts, which only ever errs toward letting a real user
 * back in.
 *
 * Only failures count. A user who signs in correctly is never slowed down, and
 * a success clears that key.
 */
export class FailureLimiter {
  private readonly entries = new Map<string, { count: number; windowEnds: number }>();

  constructor(
    private readonly maxFailures: number,
    private readonly windowMs: number
  ) {}

  /** Milliseconds until this key may try again, or 0 if it may try now. */
  retryAfterMs(key: string, now: number = Date.now()): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (now >= entry.windowEnds) {
      this.entries.delete(key);
      return 0;
    }
    return entry.count >= this.maxFailures ? entry.windowEnds - now : 0;
  }

  recordFailure(key: string, now: number = Date.now()): void {
    const entry = this.entries.get(key);
    if (!entry || now >= entry.windowEnds) {
      this.entries.set(key, { count: 1, windowEnds: now + this.windowMs });
    } else {
      entry.count += 1;
    }
    // Keep the map bounded: drop anything whose window has closed.
    if (this.entries.size > 10_000) {
      for (const [k, e] of this.entries) if (now >= e.windowEnds) this.entries.delete(k);
    }
  }

  reset(key: string): void {
    this.entries.delete(key);
  }
}
