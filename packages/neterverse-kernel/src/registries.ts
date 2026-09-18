/**
 * Registry loading and validation.
 *
 * Every registry file in `.neterverse/state/` is a list of records validated
 * against a schema of the same name. Loading is strict: a registry that no
 * longer matches its schema is an error, because a control plane whose own
 * state has drifted cannot be trusted to describe anything else.
 */

import { join } from 'node:path';
import { validate, formatErrors, type ValidationError } from './validate.ts';
import { busPaths, loadSchema, readJson } from './bus.ts';

export interface RegistryFile<T> {
  name: string;
  path: string;
  entries: T[];
}

export interface RegistryProblem {
  registry: string;
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

/** Validates one registry, returning a problem per failing entry. */
export function validateRegistry(root: string, name: string): RegistryProblem[] {
  const schemaName = REGISTRY_SCHEMAS[name];
  if (!schemaName) throw new Error(`No schema is mapped for registry "${name}".`);

  const schema = loadSchema(root, schemaName);
  const { entries } = loadRegistry<unknown>(root, name);

  return entries.flatMap((entry, index) => {
    const result = validate(entry, schema);
    return result.valid ? [] : [{ registry: name, index, errors: result.errors }];
  });
}

/** Validates every mapped registry. An empty array means the bus state is clean. */
export function validateAllRegistries(root: string): RegistryProblem[] {
  return Object.keys(REGISTRY_SCHEMAS).flatMap((name) => validateRegistry(root, name));
}

export function formatProblems(problems: RegistryProblem[]): string {
  return problems
    .map((p) => `${p.registry}[${p.index}]:\n${formatErrors(p.errors)}`)
    .join('\n');
}
