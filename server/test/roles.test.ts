/**
 * Role and app catalogues. financial-services-crm is private per owner.
 * legacy-estate is the only shared workspace.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROLES, APP_IDS, isSharedApp, canWrite, type Role } from '../dist/lib/roles.js';

test('legacy-estate is the one shared workspace', () => {
  assert.equal(isSharedApp('legacy-estate'), true);
  assert.deepEqual(APP_IDS.filter(isSharedApp), ['legacy-estate']);
});

test('financial-services-crm and the other planning apps are private', () => {
  for (const appId of ['deal-architect', 'capital-readiness', 'notes-underwriting', 'financial-services-crm']) {
    assert.equal(isSharedApp(appId), false, appId);
  }
});

test('an unknown app id is not shared', () => {
  assert.equal(isSharedApp(''), false);
  assert.equal(isSharedApp('legacy_estate'), false);
  assert.equal(isSharedApp('LEGACY-ESTATE'), false);
  assert.equal(isSharedApp('some-new-app'), false);
});

test('canWrite denies only a read-only auditor', () => {
  assert.equal(canWrite('READ_ONLY_AUDITOR'), false);
  const writable = ROLES.filter((role) => role !== 'READ_ONLY_AUDITOR');
  for (const role of writable) assert.equal(canWrite(role), true);
  assert.equal(writable.length, ROLES.length - 1);
  assert.deepEqual(ROLES.filter((role) => !canWrite(role as Role)), ['READ_ONLY_AUDITOR']);
});

test('catalogues have no duplicates and include the private CRM', () => {
  assert.equal(new Set(ROLES).size, ROLES.length);
  assert.equal(new Set(APP_IDS).size, APP_IDS.length);
  assert.deepEqual([...APP_IDS].sort(), [
    'capital-readiness',
    'deal-architect',
    'financial-services-crm',
    'legacy-estate',
    'notes-underwriting',
  ]);
});
