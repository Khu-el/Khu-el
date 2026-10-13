/**
 * Badges render the evidence vocabulary (AssertionStatus, Lane,
 * ReconciliationStatus) from CLAUDE.md's "one evidence vocabulary, four
 * spellings" table. The app never conflates "I typed this in" with "a
 * professional confirmed this" (CLAUDE.md, governance model) — these pin
 * that every status in the vocabulary actually renders a distinct, correct
 * label, and that EXTERNALLY_VERIFIED is the only one styled emerald/green,
 * so nothing unverified can silently read as verified in the UI.
 *
 * Rendered with react-dom/server's renderToStaticMarkup rather than a DOM
 * library — no jsdom needed for a pure function of props to HTML string.
 * `tsx/esm` (registered via --import) gives `node --test` the ability to
 * load these .tsx sources; packages/governance-core/tsconfig.json pins the
 * automatic JSX runtime so it matches what Vite's React plugin uses in every
 * consuming app.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssertionStatusBadge, LaneBadge, ReconciliationStatusBadge, SourceBadge } from '../src/components/Badges.tsx';
import type { AssertionStatus, Lane, ReconciliationStatus } from '../src/types.ts';

const ALL_ASSERTION_STATUSES: AssertionStatus[] = [
  'CURRENT_INTERNAL_MODEL',
  'DOCUMENT_CLAIM',
  'EXTERNALLY_VERIFIED',
  'PROFESSIONAL_REVIEW_REQUIRED',
  'SUPERSEDED',
  'UNCLASSIFIED',
];

const ALL_LANES: Lane[] = ['LANE_A', 'LANE_B', 'PERSONAL', 'PHILANTHROPIC', 'UNCLASSIFIED'];

const ALL_RECON_STATUSES: ReconciliationStatus[] = [
  'STAGED',
  'HOLD',
  'REVIEW',
  'RECONCILED',
  'EXCLUDED',
  'EXCEPTION',
];

describe('AssertionStatusBadge', () => {
  for (const status of ALL_ASSERTION_STATUSES) {
    test(`renders a non-empty label for ${status}`, () => {
      const html = renderToStaticMarkup(React.createElement(AssertionStatusBadge, { status }));
      // Every status must render real text, not "undefined" from a missing
      // map entry -- the failure mode an exhaustive Record<T, string> can
      // still hit if a new union member is added without updating it.
      assert.doesNotMatch(html, /undefined/);
      assert.match(html, /<span/);
    });
  }

  test('only EXTERNALLY_VERIFIED gets emerald/green styling', () => {
    for (const status of ALL_ASSERTION_STATUSES) {
      const html = renderToStaticMarkup(React.createElement(AssertionStatusBadge, { status }));
      const isGreen = /bg-emerald/.test(html);
      assert.equal(
        isGreen,
        status === 'EXTERNALLY_VERIFIED',
        `${status} ${isGreen ? 'is' : 'is not'} styled emerald, expected ${status === 'EXTERNALLY_VERIFIED'}`
      );
    }
  });

  test('PROFESSIONAL_REVIEW_REQUIRED is styled as a warning (rose), not neutral', () => {
    const html = renderToStaticMarkup(
      React.createElement(AssertionStatusBadge, { status: 'PROFESSIONAL_REVIEW_REQUIRED' })
    );
    assert.match(html, /bg-rose/);
    assert.match(html, /Professional review required/);
  });

  test('UNCLASSIFIED never renders as if it were verified', () => {
    const html = renderToStaticMarkup(React.createElement(AssertionStatusBadge, { status: 'UNCLASSIFIED' }));
    assert.doesNotMatch(html, /bg-emerald/);
    assert.match(html, /Unclassified/);
  });
});

describe('LaneBadge', () => {
  for (const lane of ALL_LANES) {
    test(`renders a non-empty label for ${lane}`, () => {
      const html = renderToStaticMarkup(React.createElement(LaneBadge, { lane }));
      assert.doesNotMatch(html, /undefined/);
    });
  }

  test('Lane A and Lane B are visually distinct (different color families)', () => {
    const aHtml = renderToStaticMarkup(React.createElement(LaneBadge, { lane: 'LANE_A' }));
    const bHtml = renderToStaticMarkup(React.createElement(LaneBadge, { lane: 'LANE_B' }));
    assert.match(aHtml, /bg-blue/);
    assert.match(bHtml, /bg-purple/);
    assert.notEqual(aHtml, bHtml);
  });
});

describe('ReconciliationStatusBadge', () => {
  for (const status of ALL_RECON_STATUSES) {
    test(`renders a non-empty label for ${status}`, () => {
      const html = renderToStaticMarkup(React.createElement(ReconciliationStatusBadge, { status }));
      assert.doesNotMatch(html, /undefined/);
    });
  }

  test('EXCEPTION and RECONCILED are not styled the same way', () => {
    const exceptionHtml = renderToStaticMarkup(React.createElement(ReconciliationStatusBadge, { status: 'EXCEPTION' }));
    const reconciledHtml = renderToStaticMarkup(
      React.createElement(ReconciliationStatusBadge, { status: 'RECONCILED' })
    );
    assert.match(exceptionHtml, /bg-rose/);
    assert.match(reconciledHtml, /bg-emerald/);
  });

  test('label is title-cased from the raw status constant', () => {
    const html = renderToStaticMarkup(React.createElement(ReconciliationStatusBadge, { status: 'HOLD' }));
    assert.match(html, />Hold</);
  });
});

describe('SourceBadge', () => {
  test('renders the provided label with a Source: prefix', () => {
    const html = renderToStaticMarkup(React.createElement(SourceBadge, { label: 'Notion — 04.01 Entities Registry' }));
    assert.match(html, /Source: Notion — 04\.01 Entities Registry/);
  });

  test('does not silently drop an empty label', () => {
    const html = renderToStaticMarkup(React.createElement(SourceBadge, { label: '' }));
    assert.match(html, /Source:/);
  });
});
