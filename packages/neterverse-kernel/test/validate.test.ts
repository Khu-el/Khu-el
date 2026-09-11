import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/validate.ts';

test('required, type and additionalProperties are enforced', () => {
  const schema = {
    type: 'object',
    required: ['name', 'count'],
    additionalProperties: false,
    properties: { name: { type: 'string' }, count: { type: 'integer' } },
  };

  assert.equal(validate({ name: 'a', count: 1 }, schema).valid, true);
  assert.equal(validate({ name: 'a' }, schema).valid, false);
  assert.equal(validate({ name: 'a', count: 1.5 }, schema).valid, false);
  assert.equal(validate({ name: 'a', count: 1, extra: true }, schema).valid, false);
});

test('enum, const and pattern are enforced', () => {
  assert.equal(validate('R9', { enum: ['R0', 'R1'] }).valid, false);
  assert.equal(validate('R1', { enum: ['R0', 'R1'] }).valid, true);
  assert.equal(validate('x', { const: 'y' }).valid, false);
  assert.equal(validate('evt_abc', { type: 'string', pattern: '^evt_' }).valid, true);
  assert.equal(validate('abc', { type: 'string', pattern: '^evt_' }).valid, false);
});

test('date-time format rejects a plain date', () => {
  const schema = { type: 'string', format: 'date-time' };
  assert.equal(validate('2026-09-10T00:00:00Z', schema).valid, true);
  assert.equal(validate('2026-09-10T00:00:00.123+02:00', schema).valid, true);
  assert.equal(validate('2026-09-10', schema).valid, false);
});

test('union types and null are handled', () => {
  const schema = { type: ['string', 'null'] };
  assert.equal(validate(null, schema).valid, true);
  assert.equal(validate('x', schema).valid, true);
  assert.equal(validate(3, schema).valid, false);
});

test('array items and minItems are checked', () => {
  const schema = { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } };
  assert.equal(validate(['a'], schema).valid, true);
  assert.equal(validate([], schema).valid, false);
  assert.equal(validate([''], schema).valid, false);
  assert.equal(validate([1], schema).valid, false);
});

test('a wrong type suppresses downstream noise', () => {
  const result = validate(42, { type: 'string', minLength: 5, pattern: '^a' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1, 'one clear type error, not three derived ones');
});

test('an unsupported keyword is reported rather than silently skipped', () => {
  // Silently ignoring a constraint would produce unearned confidence.
  const result = validate({}, { type: 'object', oneOf: [{ type: 'object' }] });
  assert.equal(result.valid, false);
  assert.match(result.errors[0]?.message ?? '', /unsupported keyword "oneOf"/);
});

test('error paths point at the offending field', () => {
  const schema = {
    type: 'object',
    properties: { items: { type: 'array', items: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } } } },
  };
  const result = validate({ items: [{ id: 'a' }, {}] }, schema);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0]?.path, 'items[1].id');
});
