/**
 * The committed-state audit.
 *
 * `Khu-el/Khu-el` is public. During the first build of this bus a draft of the
 * state files carried a calendar address, file identifiers and named commercial
 * detail; it was caught by reading, which is not a control that scales. This
 * module makes the boundary a check that runs.
 *
 * It scans what git would publish - every committed directory under the bus
 * root, plus the loose files at the root itself - and never `live/`, which is
 * ignored precisely so it can hold the identifying material.
 *
 * The list of scanned directories is derived from what is NOT ignored rather
 * than from a hand-kept allow-list. An allow-list is the failure mode here: it
 * was missing `evidence/` and `locks/`, both of which git publishes, so the
 * audit reported a boundary it had not actually looked at. A new committed
 * directory is now covered the moment it exists.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { LIVE_DIRNAME } from './observations.ts';

export interface AuditFinding {
  file: string;
  line: number;
  rule: string;
  excerpt: string;
}

/**
 * Directories under the bus root that git ignores and this scan therefore
 * skips. Everything else under the root is published and is scanned.
 */
const IGNORED_DIRS: ReadonlySet<string> = new Set([LIVE_DIRNAME, 'node_modules', '.git']);

interface Rule {
  name: string;
  pattern: RegExp;
  /** Substrings that make a match a false positive rather than a leak. */
  allow?: RegExp;
  /**
   * Narrows a broad pattern to the shapes that actually carry risk.
   *
   * Precision matters more than reach here: a rule that fires on every
   * correlation id and filename gets switched off, and then it protects
   * nothing. Each of these was tightened against real bus state until the only
   * things left were genuine external identifiers.
   */
  confirm?: (match: string) => boolean;
}

const hasUpper = (s: string) => /[A-Z]/.test(s);
const hasLower = (s: string) => /[a-z]/.test(s);
const hasDigit = (s: string) => /[0-9]/.test(s);

/**
 * How often the string flips between upper and lower case.
 *
 * This is what separates a random token from a hyphenated human name. Base64ish
 * identifiers alternate case constantly; `ADR-0001-control-plane-foundation`
 * and `claude-code-init-2026-09-10` never do. Counting the flips lets a rule
 * reach segmented identifiers without firing on every decision record and
 * instance id in the bus.
 */
function caseFlips(s: string): number {
  let flips = 0;
  for (let i = 1; i < s.length; i += 1) {
    const a = s[i - 1]!;
    const b = s[i]!;
    if (!/[A-Za-z]/.test(a) || !/[A-Za-z]/.test(b)) continue;
    if ((a === a.toUpperCase()) !== (b === b.toUpperCase())) flips += 1;
  }
  return flips;
}

const RULES: Rule[] = [
  {
    name: 'email address',
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    // Schema ids and the attribution address are not contact details.
    allow: /json-schema\.org|neterverse:\/\/|noreply@anthropic\.com/,
  },
  {
    name: 'Drive-style file identifier',
    // High-entropy token: long, no separators, and mixing case with digits.
    // Our own ids are lowercase and word-shaped, so they do not match.
    pattern: /\b[A-Za-z0-9_]{25,}\b/g,
    confirm: (m) => hasUpper(m) && hasLower(m) && hasDigit(m),
  },
  {
    name: 'segmented file identifier',
    // Drive and Docs identifiers routinely carry `-` and `_`. Each separator
    // ends a word boundary, which chops the token into pieces too short for the
    // rule above - a real identifier spread over five segments walked straight
    // through. This rule rejoins the segments before judging them, and uses the
    // case-flip count so hyphenated names of our own stay quiet.
    pattern: /\b[A-Za-z0-9]{2,}(?:[-_][A-Za-z0-9]{2,})+\b/g,
    confirm: (m) => {
      const joined = m.replace(/[-_]/g, '');
      return (
        joined.length >= 25 &&
        hasUpper(joined) &&
        hasLower(joined) &&
        hasDigit(joined) &&
        caseFlips(joined) >= 5
      );
    },
  },
  {
    name: 'workspace or record numeric identifier',
    pattern: /\b\d{9,}\b/g,
  },
  {
    name: 'UUID',
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  },
  {
    name: 'long hex string',
    pattern: /\b[0-9a-f]{32,}\b/g,
    // A 40-character lowercase hex string is a git SHA, which belongs in a handoff.
    confirm: (m) => m.length !== 40,
  },
  {
    name: 'bearer or API token',
    pattern: /\b(?:sk|pk|ghp|gho|xox[baprs])[-_][A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'private key block',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
];

/** Every published file under `dir`, recursively, skipping the ignored directories. */
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** Applies every rule to one line (or to a path), recording what it finds. */
function scan(file: string, text: string, line: number, findings: AuditFinding[]): void {
  for (const rule of RULES) {
    for (const match of text.match(rule.pattern) ?? []) {
      if (rule.allow?.test(match)) continue;
      if (rule.confirm && !rule.confirm(match)) continue;
      findings.push({
        file,
        line,
        rule: rule.name,
        excerpt: match.length > 60 ? `${match.slice(0, 57)}...` : match,
      });
    }
  }
}

/**
 * Scans committed bus state for anything that should not be published.
 *
 * An empty result means the boundary held. It is not proof that no sensitive
 * material exists - a pattern scan catches shapes, not meaning - so it
 * supplements reading the diff rather than replacing it.
 */
export function auditCommittedState(root: string): AuditFinding[] {
  const findings: AuditFinding[] = [];

  for (const file of walk(root)) {
    const name = relative(root, file);

    // Defensive: the live directory must never be reachable from here, even
    // through a symlink that `walk` followed.
    if (name.split(/[\\/]/).includes(LIVE_DIRNAME)) continue;

    // A path is published too. A task file named after a customer leaks the
    // customer whatever the file contains, so line 0 is the name itself.
    scan(name, name, 0, findings);

    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => scan(name, line, i + 1, findings));
  }

  return findings;
}

export function formatFindings(findings: AuditFinding[]): string {
  return findings
    .map((f) => `  ${f.file}:${f.line}  ${f.rule}: ${f.excerpt}`)
    .join('\n');
}
