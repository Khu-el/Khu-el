/**
 * An empty number field is "not entered", not zero, and a typed zero is zero.
 *
 * Every field used to store Number('') -- which is 0 -- when cleared, and to
 * display `x || ''`, which hides a real 0. These pin the round trip both ways.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { fmtPlain, fromInputValue, known, knownFields, sumKnown, toInputValue } from '../src/numbers.ts';

describe('input round trip', () => {
  test('an empty field stores null, not 0', () => {
    assert.equal(fromInputValue(''), null);
    assert.equal(fromInputValue('   '), null);
  });

  test('a typed 0 stores 0 and displays as 0', () => {
    assert.equal(fromInputValue('0'), 0);
    assert.equal(toInputValue(0), 0);
  });

  test('null, undefined and NaN display as an empty box', () => {
    assert.equal(toInputValue(null), '');
    assert.equal(toInputValue(undefined), '');
    assert.equal(toInputValue(NaN), '');
  });

  test('ordinary numbers pass through', () => {
    assert.equal(fromInputValue('1250.5'), 1250.5);
    assert.equal(fromInputValue('-3'), -3);
    assert.equal(toInputValue(42), 42);
  });
});

describe('known()', () => {
  test('not entered becomes NaN, so the calculation shows a dash', () => {
    assert.ok(Number.isNaN(known(null)));
    assert.ok(Number.isNaN(known(undefined)));
  });

  test('a real zero stays zero', () => {
    assert.equal(known(0), 0);
  });
});

describe('sumKnown()', () => {
  test('blank rows are skipped rather than blanking the total', () => {
    assert.equal(sumKnown([100, null, 50]), 150);
  });

  test('a list with no rows, or only blank rows, totals zero', () => {
    assert.equal(sumKnown([]), 0);
    assert.equal(sumKnown([null, undefined]), 0);
  });

  test('entered zeros are a real zero total', () => {
    assert.equal(sumKnown([0, null]), 0);
  });
});

describe('knownFields()', () => {
  test('nulls become NaN, everything else passes through', () => {
    const v = knownFields({ arv: null as number | null, rule: 0.7 as number | null, address: 'x', list: [1] });
    assert.ok(Number.isNaN(v.arv));
    assert.equal(v.rule, 0.7);
    assert.equal(v.address, 'x');
    assert.deepEqual(v.list, [1]);
  });
});

describe('fmtPlain()', () => {
  test('a dash for not entered, the number otherwise', () => {
    assert.equal(fmtPlain(null, '%'), '—');
    assert.equal(fmtPlain(7.5, '%'), '7.5%');
    assert.equal(fmtPlain(0, 'mo'), '0mo');
  });
});
