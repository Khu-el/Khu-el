/**
 * Registry loading and validation.
 *
 * Every registry file in `.neterverse/state/` is a list of records validated
 * against a schema of the same name. Loading is strict: a registry that no
 * longer matches its schema is an error, because a control plane whose own
 * state has drifted cannot be trusted to describe anything else.
 *
 * Strictness has to include knowing what was *not* checked. `state/` holds six
 * files and only three have a schema mapped, so a validator that reports on the
 * three it knows and says nothing about the rest produces the one outcome this
 * repository's standard forbids: a green tick over unverified ground. Coverage
 * is therefore part of the result, not an implicit assumption.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { validate, formatErrors, type ValidationError } from './validate.ts';
import { busPaths, loadSchema, readJson } from './bus.ts';

export interface RegistryFile<T> {
  name: string;
  path: string;
  entries: T[];
}

export type RegistryProblemKind =
  /** An entry in a mapped registry failed its schema. */
  | 'ENTRY_INVALID'
  /** A registry has a schema mapped but the file is not there. */
  | 'FILE_MISSING';

export interface RegistryProblem {
  registry: string;
  kind: RegistryProblemKind;
  /** Index of the offending entry, or -1 for a problem with the file itself. */
  index: number;
  errors: ValidationError[];
}

/** Registry file name -> schema name. */
export const REGISTRY_SCHEMAS: Readonly<Record<string, string>> = {
  'connector-registry': 'connector',
  'capability-registry': 'capability',
  'agent-registry': 'agent',
};

export function loadRegistry<T>(root: string, name: string): RegistryFile<T> {
  const path = join(busPaths(root).state, `${name}.json`);
  const raw = readJson<{ entries?: T[] } | T[]>(path, { entries: [] });
  const entries = Array.isArray(raw) ? raw : (raw.entries ?? []);
  return { name, path, entries };
}

/** Every `*.json` file actually present in `state/`, by bare name. */
export function stateFiles(root: string): string[] {
  const dir = busPaths(root).state;
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

/** State files present on disk that no schema covers, so nothing validated them. */
export function unvalidatedStateFiles(root: string): string[] {
  return stateFiles(root).filter((name) => !(name in REGISTRY_SCHEMAS));
}

/**
 * Validates one registry, returning a problem per failing entry.
 *
 * A missing file is a problem in its own right rather than an empty pass.
 * `readJson` falls back to `{ entries: [] }` when the file is absent, so the
 * obvious spelling reports a deleted registry as valid - which is how a control
 * plane ends up certifying state it no longer has.
 */
export function validateRegistry(root: string, name: string): RegistryProblem[] {
  const schemaName = REGISTRY_SCHEMAS[name];
  if (!schemaName) throw new Error(`No schema is mapped for registry "${name}".`);

  const path = join(busPaths(root).state, `${name}.json`);
  if (!existsSync(path)) {
    // A bus with no state at all has not been initialized yet, and reporting
    // every registry as missing on a fresh scaffold is noise. Once any registry
    // exists, a mapped one that does not is drift and is reported as such.
    if (stateFiles(root).length === 0) return [];
    return [{
      registry: name,
      kind: 'FILE_MISSING',
      index: -1,
      errors: [{ path, message: 'registry file is missing, so nothing was validated' }],
    }];
  }

  const schema = loadSchema(root, schemaName);
  const { entries } = loadRegistry<unknown>(root, name);

  return entries.flatMap((entry, index) => {
    const result = validate(entry, schema);
    return result.valid ? [] : [{ registry: name, kind: 'ENTRY_INVALID' as const, index, errors: result.errors }];
  });
}

/** Validates every mapped registry. An empty array means every mapped file passed. */
export function validateAllRegistries(root: string): RegistryProblem[] {
  return Object.keys(REGISTRY_SCHEMAS).flatMap((name) => validateRegistry(root, name));
}

export function formatProblems(problems: RegistryProblem[]): string {
  return problems
    .map((p) => `${p.registry}${p.index >= 0 ? `[${p.index}]` : ''}:\n${formatErrors(p.errors)}`)
    .join('\n');
}
