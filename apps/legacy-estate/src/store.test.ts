import { describe, expect, it } from 'vitest';
import { createEstate } from './store';

describe('createEstate', () => {
  it('creates a staged Lane B estate with empty collections', () => {
    const estate = createEstate('House of Ransom');

    expect(estate.data.familyName).toBe('House of Ransom');
    expect(estate.authority.lane).toBe('LANE_B');
    expect(estate.reconciliationStatus).toBe('STAGED');
    expect(estate.evidenceRefs).toEqual([]);
    expect(estate.createdAt).toBe(estate.updatedAt);
    expect(estate.data).toMatchObject({
      assets: [],
      documents: [],
      beneficiaries: [],
      insurance: [],
      businessInterests: [],
      distributions: [],
      continuityContacts: [],
      archive: [],
    });
  });
});
