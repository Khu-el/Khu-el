import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { makeBus } from './helpers.ts';
import { writeJson } from '../src/bus.ts';
import { validateRegistry, validateAllRegistries, loadRegistry, REGISTRY_SCHEMAS } from '../src/registries.ts';

const connector = (over: Record<string, unknown> = {}) => ({
  connector_id: 'drive',
  name: 'Google Drive',
  role: 'Canonical files and evidence',
  verification_state: 'LIVE_VERIFIED',
  access: 'READ_WRITE',
  last_verified: '2026-09-10T00:00:00Z',
  ...over,
});

test('an empty bus validates clean', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  assert.deepEqual(validateAllRegistries(bus.root), []);
});

test('a well-formed registry validates', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  writeJson(join(bus.root, 'state', 'connector-registry.json'), { entries: [connector()] });
  assert.deepEqual(validateRegistry(bus.root, 'connector-registry'), []);
  assert.equal(loadRegistry(bus.root, 'connector-registry').entries.length, 1);
});

test('an invented verification state is rejected', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);

  // "PROBABLY_FINE" is exactly the kind of state this registry exists to prevent.
  writeJson(join(bus.root, 'state', 'connector-registry.json'), {
    entries: [connector({ verification_state: 'PROBABLY_FINE' })],
  });

  const problems = validateRegistry(bus.root, 'connector-registry');
  assert.equal(problems.length, 1);
  assert.equal(problems[0]?.index, 0);
  assert.match(problems[0]?.errors[0]?.message ?? '', /must be one of/);
});

test('a bare array registry loads the same as an entries object', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  writeJson(join(bus.root, 'state', 'connector-registry.json'), [connector()]);
  assert.equal(loadRegistry(bus.root, 'connector-registry').entries.length, 1);
});

test('an unmapped registry name is an error, not an empty pass', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  assert.throws(() => validateRegistry(bus.root, 'imaginary-registry'), /No schema is mapped/);
});

test('every mapped registry has a schema file present', (t) => {
  const bus = makeBus();
  t.after(bus.cleanup);
  for (const name of Object.keys(REGISTRY_SCHEMAS)) {
    assert.doesNotThrow(() => validateRegistry(bus.root, name), `${name} should resolve its schema`);
  }
});
