/**
 * Gates render the hard boundary CLAUDE.md states in prose: "no filing,
 * signing, transacting, publishing, or representing the principal
 * externally. There is deliberately no code path." NoAutonomousExecutionBanner
 * is that boundary made visible in every app's shell, and
 * ProfessionalReviewGate is where PROFESSIONAL_REVIEW_REQUIRED content is
 * actually gated from looking like a finished answer.
 *
 * A regression that silently dropped this text, or let it render empty,
 * would not fail typecheck or build -- only a test that asserts on the
 * rendered content would catch it. That is the gap this file closes.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  NoAutonomousExecutionBanner,
  NotLegalOrFinancialAdviceFooter,
  ProfessionalReviewGate,
} from '../src/components/Gates.tsx';

describe('NoAutonomousExecutionBanner', () => {
  test('states plainly that the tool does not act', () => {
    const html = renderToStaticMarkup(React.createElement(NoAutonomousExecutionBanner));
    assert.match(html, /drafts, calculates, and organizes/);
    assert.match(html, /does not act/);
  });

  test('names every action it refuses to take', () => {
    const html = renderToStaticMarkup(React.createElement(NoAutonomousExecutionBanner));
    for (const forbidden of ['contacts a third party', 'sends money', 'signs anything', 'files anything', 'executes a transaction']) {
      assert.match(html, new RegExp(forbidden), `banner text dropped "${forbidden}"`);
    }
  });

  test('renders optional children alongside the fixed disclaimer, without replacing it', () => {
    const html = renderToStaticMarkup(
      React.createElement(NoAutonomousExecutionBanner, null, React.createElement('span', null, 'app-specific note'))
    );
    assert.match(html, /does not act/);
    assert.match(html, /app-specific note/);
  });

  test('renders nothing extra when no children are passed', () => {
    const html = renderToStaticMarkup(React.createElement(NoAutonomousExecutionBanner));
    assert.ok(html.length > 0);
  });
});

describe('ProfessionalReviewGate', () => {
  test('renders the supplied title and body content', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        ProfessionalReviewGate,
        { title: 'Outside business activity determination required' },
        React.createElement('p', null, 'This instrument cannot circulate until CP-2 is on file.')
      )
    );
    assert.match(html, /Outside business activity determination required/);
    assert.match(html, /cannot circulate until CP-2 is on file/);
  });

  test('is styled as an attention-getting gate (rose border), not a neutral card', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProfessionalReviewGate, { title: 'Hold' }, React.createElement('p', null, 'why'))
    );
    assert.match(html, /border-rose/);
  });

  test('does not silently swallow an empty title', () => {
    const html = renderToStaticMarkup(
      React.createElement(ProfessionalReviewGate, { title: '' }, React.createElement('p', null, 'body text'))
    );
    assert.match(html, /body text/);
  });
});

describe('NotLegalOrFinancialAdviceFooter', () => {
  test('disclaims legal, tax, securities, and investment advice', () => {
    const html = renderToStaticMarkup(React.createElement(NotLegalOrFinancialAdviceFooter));
    for (const term of ['legal', 'tax', 'securities', 'investment advice']) {
      assert.match(html, new RegExp(term, 'i'), `footer text dropped "${term}"`);
    }
  });

  test('instructs verifying with a licensed professional before relying on output', () => {
    const html = renderToStaticMarkup(React.createElement(NotLegalOrFinancialAdviceFooter));
    assert.match(html, /licensed professional/);
    assert.match(html, /no figure here is guaranteed/);
  });
});
