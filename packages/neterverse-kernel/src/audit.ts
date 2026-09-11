/**
 * The committed-state audit.
 *
 * `Khu-el/Khu-el` is public. During the first build of this bus a draft of the
 * state files carried a calendar address, file identifiers and named commercial
 * detail; it was caught by reading, which is not a control that scales. This
 * module makes the boundary a check that runs.
 *
 * It scans only what git would publish - `state/`, `events/`, `schemas/`,
 * `decisions/`, `reports/`, `tasks/`, `handoffs/` - and never `live/`, which is
 * ignored precisely so it can hold the identifying material.
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

/** Directories under the bus root that are committed and therefore published. */
const COMMITTED_DIRS = ['state', 'events', 'schemas', 'decisions', 'reports', 'tasks', 'handoffs'];

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

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
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

  for (const dirName of COMMITTED_DIRS) {
    for (const file of walk(join(root, dirName))) {
      // Defensive: the live directory must never be reachable from here.
      if (relative(root, file).split(/[\\/]/).includes(LIVE_DIRNAME)) continue;

      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const rule of RULES) {
          for (const match of line.match(rule.pattern) ?? []) {
            if (rule.allow?.test(match)) continue;
            if (rule.confirm && !rule.confirm(match)) continue;
            findings.push({
              file: relative(root, file),
              line: i + 1,
              rule: rule.name,
              excerpt: match.length > 60 ? `${match.slice(0, 57)}...` : match,
            });
          }
        }
      });
    }
  }

  return findings;
}

export function formatFindings(findings: AuditFinding[]): string {
  return findings
    .map((f) => `  ${f.file}:${f.line}  ${f.rule}: ${f.excerpt}`)
    .join('\n');
}
