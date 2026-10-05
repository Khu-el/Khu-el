import { describe, it, expect } from 'vitest';
import { ROLES, APP_IDS, isSharedApp, canWrite, type Role } from './roles.js';

describe('isSharedApp', () => {
  it('treats legacy-estate as the one shared workspace', () => {
    expect(isSharedApp('legacy-estate')).toBe(true);
  });

  it('treats the other three apps as private per user', () => {
    expect(isSharedApp('deal-architect')).toBe(false);
    expect(isSharedApp('capital-readiness')).toBe(false);
    expect(isSharedApp('notes-underwriting')).toBe(false);
  });

  it('does not treat an unknown app id as shared', () => {
    // Fail closed: a typo or a future app must not silently expose records
    // into the shared family workspace.
    expect(isSharedApp('')).toBe(false);
    expect(isSharedApp('legacy_estate')).toBe(false);
    expect(isSharedApp('LEGACY-ESTATE')).toBe(false);
    expect(isSharedApp('some-new-app')).toBe(false);
  });

  it('marks exactly one of the known app ids as shared', () => {
    expect(APP_IDS.filter(isSharedApp)).toEqual(['legacy-estate']);
  });
});

describe('canWrite', () => {
  it('denies writes to a read-only auditor', () => {
    expect(canWrite('READ_ONLY_AUDITOR')).toBe(false);
  });

  it('allows writes for every other defined role', () => {
    const writable = ROLES.filter((r) => r !== 'READ_ONLY_AUDITOR');
    for (const role of writable) {
      expect(canWrite(role)).toBe(true);
    }
    // Guard against the list silently shrinking to nothing.
    expect(writable.length).toBe(ROLES.length - 1);
  });

  it('keeps READ_ONLY_AUDITOR in the role list', () => {
    // canWrite is a denylist of exactly one role; if that role were ever
    // renamed or removed without updating canWrite, every user would gain
    // write access silently. This test is the tripwire for that.
    expect(ROLES).toContain('READ_ONLY_AUDITOR');
    expect(ROLES.filter((r) => !canWrite(r as Role))).toEqual(['READ_ONLY_AUDITOR']);
  });
});

describe('role and app id catalogues', () => {
  it('has no duplicate roles', () => {
    expect(new Set(ROLES).size).toBe(ROLES.length);
  });

  it('has no duplicate app ids', () => {
    expect(new Set(APP_IDS).size).toBe(APP_IDS.length);
  });

  it('lists the four known apps', () => {
    expect([...APP_IDS].sort()).toEqual([
      'capital-readiness',
      'deal-architect',
      'legacy-estate',
      'notes-underwriting',
    ]);
  });
});
