import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AssertionStatusBadge,
  LaneBadge,
  ReconciliationStatusBadge,
  SourceBadge,
} from '../src/components/Badges';
import {
  NoAutonomousExecutionBanner,
  NotLegalOrFinancialAdviceFooter,
  ProfessionalReviewGate,
} from '../src/components/Gates';
import { SyncStatusIndicator } from '../src/components/SyncStatus';
import { Checklist, Select, Stat, Tabs } from '../src/components/Ui';
import { DecisionMemo } from '../src/components/DecisionMemo';
import type { AssertionStatus, Lane, ReconciliationStatus } from '../src/types';

const render = renderToStaticMarkup;
const text = (html: string) => html.replace(/<[^>]+>/g, '');

const ASSERTIONS: AssertionStatus[] = [
  'CURRENT_INTERNAL_MODEL',
  'DOCUMENT_CLAIM',
  'EXTERNALLY_VERIFIED',
  'PROFESSIONAL_REVIEW_REQUIRED',
  'SUPERSEDED',
  'UNCLASSIFIED',
];
const LANES: Lane[] = ['LANE_A', 'LANE_B', 'PERSONAL', 'PHILANTHROPIC', 'UNCLASSIFIED'];
const RECON: ReconciliationStatus[] = ['STAGED', 'HOLD', 'REVIEW', 'RECONCILED', 'EXCLUDED', 'EXCEPTION'];

describe('AssertionStatusBadge: the UI never conflates "typed in" with "verified"', () => {
  it('every status renders a non-empty label, and the labels are all distinct', () => {
    const labels = ASSERTIONS.map((s) => text(render(<AssertionStatusBadge status={s} />)));
    for (const l of labels) expect(l.length).toBeGreaterThan(0);
    expect(new Set(labels).size).toBe(ASSERTIONS.length);
  });

  it('only EXTERNALLY_VERIFIED reads as verified', () => {
    for (const s of ASSERTIONS) {
      const t = text(render(<AssertionStatusBadge status={s} />)).toLowerCase();
      if (s === 'EXTERNALLY_VERIFIED') expect(t).toContain('verified');
      else expect(t).not.toContain('verified');
    }
  });

  it('only EXTERNALLY_VERIFIED is styled as the green (verified) state', () => {
    for (const s of ASSERTIONS) {
      const html = render(<AssertionStatusBadge status={s} />);
      if (s === 'EXTERNALLY_VERIFIED') expect(html).toContain('emerald');
      else expect(html).not.toContain('emerald');
    }
  });

  it('a superseded claim is struck through and an unclassified one is visibly dashed', () => {
    expect(render(<AssertionStatusBadge status="SUPERSEDED" />)).toContain('line-through');
    expect(render(<AssertionStatusBadge status="UNCLASSIFIED" />)).toContain('border-dashed');
  });

  it('professional-review-required is styled as a warning, not as verified', () => {
    const html = render(<AssertionStatusBadge status="PROFESSIONAL_REVIEW_REQUIRED" />);
    expect(html).toContain('rose');
    expect(text(html)).toMatch(/review required/i);
  });
});

describe('LaneBadge: Lane A and Lane B never look alike', () => {
  it('every lane has a distinct label and a distinct colour family', () => {
    const labels = LANES.map((l) => text(render(<LaneBadge lane={l} />)));
    expect(new Set(labels).size).toBe(LANES.length);
    const colour = (l: Lane) => /bg-([a-z]+)-/.exec(render(<LaneBadge lane={l} />))![1];
    expect(colour('LANE_A')).not.toBe(colour('LANE_B'));
    expect(new Set(LANES.filter((l) => l !== 'UNCLASSIFIED').map(colour)).size).toBe(LANES.length - 1);
  });
});

describe('ReconciliationStatusBadge and SourceBadge', () => {
  it('capitalises the status and keeps RECONCILED the only green one', () => {
    for (const s of RECON) {
      const html = render(<ReconciliationStatusBadge status={s} />);
      expect(text(html)).toBe(s[0] + s.slice(1).toLowerCase());
      if (s === 'RECONCILED') expect(html).toContain('emerald');
      else expect(html).not.toContain('emerald');
    }
  });

  it('escapes a hostile source label', () => {
    const html = render(<SourceBadge label={'<img src=x onerror=alert(1)>'} />);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});

describe('Gates', () => {
  it('the banner states that the tool does not act, and renders its children', () => {
    const t = text(render(<NoAutonomousExecutionBanner>extra note</NoAutonomousExecutionBanner>));
    expect(t).toContain('It does not act');
    expect(t).toMatch(/never contacts a third party/i);
    expect(t).toContain('extra note');
  });

  it('the footer disclaims legal, tax and investment advice and any guarantee', () => {
    const t = text(render(<NotLegalOrFinancialAdviceFooter />));
    expect(t).toMatch(/legal, tax, securities, or\s+investment advice/);
    expect(t).toMatch(/no figure here is guaranteed/);
  });

  it('the professional-review gate shows its title and body', () => {
    const t = text(render(<ProfessionalReviewGate title="Attorney review">Do not file.</ProfessionalReviewGate>));
    expect(t).toContain('Attorney review');
    expect(t).toContain('Do not file.');
  });
});

describe('SyncStatusIndicator', () => {
  it('renders nothing when idle', () => {
    expect(render(<SyncStatusIndicator status="idle" />)).toBe('');
  });

  it('unsynced and offline states are warnings; only synced is green', () => {
    expect(render(<SyncStatusIndicator status="pending" />)).toContain('amber');
    expect(text(render(<SyncStatusIndicator status="pending" />))).toMatch(/Unsynced changes/);
    expect(render(<SyncStatusIndicator status="offline" />)).toContain('amber');
    expect(render(<SyncStatusIndicator status="synced" />)).toContain('emerald');
    expect(render(<SyncStatusIndicator status="syncing" />)).not.toContain('emerald');
  });

  it('puts the error in an escaped title attribute', () => {
    const html = render(<SyncStatusIndicator status="offline" error={'"><script>alert(1)</script>'} />);
    expect(html).not.toContain('<script>');
    expect(html).toContain('title="&quot;&gt;&lt;script&gt;');
  });
});

describe('Ui primitives', () => {
  it('Checklist counts completed items and never renders NaN for an empty list', () => {
    const items = [
      { id: 'a', label: 'A', done: true },
      { id: 'b', label: 'B', done: false },
      { id: 'c', label: 'C', done: false },
    ];
    expect(text(render(<Checklist items={items} onToggle={() => {}} />))).toContain('1 / 3 complete');
    expect(render(<Checklist items={items} onToggle={() => {}} />)).toContain('width:33.33');
    const empty = render(<Checklist items={[]} onToggle={() => {}} />);
    expect(empty).toContain('width:0%');
    expect(empty).not.toContain('NaN');
    expect(text(empty)).toContain('0 / 0 complete');
  });

  it('Checklist strikes through only completed items', () => {
    const html = render(<Checklist items={[{ id: 'a', label: 'Done', done: true }, { id: 'b', label: 'Open', done: false }]} onToggle={() => {}} />);
    expect(/line-through[^>]*>Done/.test(html)).toBe(true);
    expect(/line-through[^>]*>Open/.test(html)).toBe(false);
  });

  it('Tabs marks exactly the active tab', () => {
    const html = render(<Tabs tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} active="b" onChange={() => {}} />);
    expect(html.match(/border-neutral-900/g)).toHaveLength(1);
    expect(/border-neutral-900[^>]*>B</.test(html)).toBe(true);
  });

  it('Select marks the current value and Stat shows its dash for a missing figure', () => {
    const html = render(<Select value="b" onChange={() => {}} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />);
    expect(html).toContain('<option value="b" selected="">B</option>');
    expect(text(render(<Stat label="DSCR" value="—" sub="not entered" />))).toBe('DSCR—not entered');
  });
});

describe('DecisionMemo keeps its hard boundary: it can only ever go to the signed-in user', () => {
  const html = render(
    <DecisionMemo
      title="Offer"
      assumptions={[{ label: 'ARV', value: '$100' }]}
      lines={[{ label: 'Max offer', value: '—' }]}
      notes={['draft only']}
    />,
  );

  it('has no recipient field of any kind', () => {
    expect(html).not.toMatch(/<input/i);
    expect(html).not.toMatch(/<textarea/i);
    expect(html).not.toMatch(/<select/i);
    expect(html).not.toMatch(/type="email"/i);
    expect(html).not.toMatch(/mailto:/i);
    expect(html).not.toMatch(/name="(to|recipient|cc|bcc)"/i);
  });

  it('says plainly that nothing can be sent to anyone but the user', () => {
    expect(text(html)).toContain('Nothing here can be sent to anyone but you.');
    expect(text(html)).toContain('Email me this');
  });

  it('is labelled a draft and renders assumptions, summary and notes, with a missing figure as a dash', () => {
    const t = text(html);
    expect(t).toContain('Decision memo (draft)');
    expect(t).toContain('ARV: $100');
    expect(t).toContain('Max offer: —');
    expect(t).toContain('draft only');
  });

  it('escapes memo content', () => {
    const bad = render(<DecisionMemo title={'<b>x</b>'} assumptions={[]} lines={[{ label: '<i>l</i>', value: '<u>v</u>' }]} />);
    expect(bad).not.toContain('<b>x</b>');
    expect(bad).not.toContain('<i>l</i>');
    expect(bad).not.toContain('<u>v</u>');
  });
});
