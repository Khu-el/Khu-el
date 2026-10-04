import test from 'node:test';
import assert from 'node:assert/strict';
import { matchPathways, pathwaySnapshot, stem, tokenize } from '../src/logic/pathways.ts';
import { currentWeek, defaultWeeks, parseDay, planProgress, todayIn, weekRange } from '../src/logic/plans.ts';
import { fmtPercent, trackProgress } from '../src/logic/progress.ts';
import { formatInviteCode, isValidEmail, isValidInviteCode, normalizeEmail, normalizeInviteCode } from '../src/logic/invites.ts';
import { dataErrorMessage, signInErrorMessage, signUpErrorMessage } from '../src/logic/errors.ts';
import { parseBody, safeUrl, slugify } from '../src/logic/text.ts';
import { href, isAuthFragment, parseRoute } from '../src/logic/routes.ts';
import { appBaseUrl, readConfig } from '../src/config.ts';
import type { LearningModule, OpportunityPathway } from '../src/types.ts';

// The four pathways seeded in the live catalog (migration 20260921214125).
const P = (id: string, keywords: string[], sort: number, active = true): OpportunityPathway => ({
  id, title: id, summary: null, keywords, destination_type: 'learning_track', destination_id: id,
  sort_order: sort, is_active: active, created_at: '', updated_at: '',
});
const PATHWAYS = [
  P('money-credit', ['money', 'credit', 'debt', 'budget', 'finance', 'financial', 'income', 'capital'], 10),
  P('ai-automation', ['ai', 'automation', 'agent', 'workflow', 'software', 'technology', 'tech', 'mcp'], 20),
  P('business-systems', ['business', 'operations', 'system', 'process', 'company', 'startup', 'entrepreneur', 'sales'], 30),
  P('leadership-legacy', ['leadership', 'legacy', 'family', 'community', 'stewardship', 'purpose', 'growth'], 40),
];

test('pathways: a goal is matched by its keywords, best first', () => {
  const m = matchPathways('I want to pay off debt and build a budget for my family', PATHWAYS);
  assert.deepEqual(m.map((x) => x.pathway.id), ['money-credit', 'leadership-legacy']);
  assert.deepEqual(m[0].matched.sort(), ['budget', 'debt']);
});

test('pathways: stemming meets "budgeting" and "businesses"', () => {
  assert.equal(stem('budgeting'), 'budget');
  assert.equal(stem('businesses'), 'business');
  assert.equal(matchPathways('budgeting help', PATHWAYS)[0].pathway.id, 'money-credit');
  assert.equal(matchPathways('growing two businesses', PATHWAYS)[0].pathway.id, 'business-systems');
});

test('pathways: no match returns [] instead of guessing; inactive pathways never match', () => {
  assert.deepEqual(matchPathways('learn to paint watercolours', PATHWAYS), []);
  assert.deepEqual(matchPathways('', PATHWAYS), []);
  assert.deepEqual(matchPathways('money', [P('x', ['money'], 1, false)]), []);
});

test('pathways: ties break on sort order and the limit holds', () => {
  const m = matchPathways('ai money business family', PATHWAYS, 2);
  assert.deepEqual(m.map((x) => x.pathway.id), ['money-credit', 'ai-automation']);
});

test('pathways: tokenize drops stop words and single letters', () => {
  assert.deepEqual(tokenize('I want a Better AI workflow!'), ['better', 'ai', 'workflow']);
});

test('pathways: a snapshot keeps only the descriptive fields', () => {
  assert.deepEqual(Object.keys(pathwaySnapshot(PATHWAYS[0])).sort(), ['destination_id', 'destination_type', 'id', 'summary', 'title']);
});

test('plans: four weeks, numbered 1-4, mentioning the goal', () => {
  const w = defaultWeeks('Launch my store', 'Business Systems');
  assert.deepEqual(w.map((x) => x.week_number), [1, 2, 3, 4]);
  assert.match(w[0].action_text, /Launch my store/);
  assert.match(w[1].action_text, /Business Systems/);
});

test('plans: dates — week ranges cover exactly 30 days', () => {
  assert.deepEqual(weekRange('2026-10-01', 1), { from: '2026-10-01', to: '2026-10-07' });
  assert.deepEqual(weekRange('2026-10-01', 4), { from: '2026-10-22', to: '2026-10-30' });
  assert.equal(weekRange('2026-10-01', 5), null);
  assert.equal(weekRange('not-a-date', 1), null);
});

test('plans: currentWeek is 0 before the start, 1-4 during, 5 after day 30', () => {
  assert.equal(currentWeek('2026-10-10', '2026-10-09'), 0);
  assert.equal(currentWeek('2026-10-10', '2026-10-10'), 1);
  assert.equal(currentWeek('2026-10-10', '2026-10-17'), 2);
  assert.equal(currentWeek('2026-10-10', '2026-11-08'), 4);
  assert.equal(currentWeek('2026-10-10', '2026-11-09'), 5);
  assert.equal(currentWeek('bad', '2026-11-09'), 0);
});

test('plans: parseDay rejects impossible dates', () => {
  assert.equal(parseDay('2026-02-30'), null);
  assert.ok(parseDay('2028-02-29'));
});

test('plans: progress counts completed weeks; an empty plan is 0%', () => {
  assert.deepEqual(planProgress([{ completed: true }, { completed: false }, { completed: true }, { completed: false }]), { done: 2, total: 4, percent: 50 });
  assert.deepEqual(planProgress([]), { done: 0, total: 0, percent: 0 });
});

test('plans: todayIn uses the member timezone and survives a bad one', () => {
  const now = new Date('2026-10-03T02:30:00Z');
  assert.equal(todayIn('America/New_York', now), '2026-10-02');
  assert.equal(todayIn('UTC', now), '2026-10-03');
  assert.equal(todayIn('Not/AZone', now), '2026-10-03');
});

const M = (id: string, track: string, sort: number): LearningModule => ({
  id, track_id: track, title: id, summary: null, content_type: 'lesson', content_url: null, body: null,
  sort_order: sort, is_published: true, created_at: '', updated_at: '',
});

test('progress: percent and next module follow sort order', () => {
  const mods = [M('b', 't', 2), M('a', 't', 1), M('c', 't', 3), M('z', 'other', 1)];
  const p = trackProgress('t', mods, [{ track_id: 't', module_id: 'a', completed: true }, { track_id: 'other', module_id: 'z', completed: true }]);
  assert.equal(p.completed, 1);
  assert.equal(p.total, 3);
  assert.equal(p.percent, 33);
  assert.equal(p.next?.id, 'b');
});

test('progress: a track with no modules is "—", never 0%', () => {
  const p = trackProgress('t', [], []);
  assert.ok(Number.isNaN(p.percent));
  assert.equal(fmtPercent(p.percent), '—');
  assert.equal(fmtPercent(0), '0%');
});

test('invites: email and code normalisation matches the database rule', () => {
  assert.equal(normalizeEmail('  New.Person@Example.COM '), 'new.person@example.com');
  assert.ok(isValidEmail('a@b.co'));
  assert.ok(!isValidEmail('a@b'));
  assert.equal(normalizeInviteCode('AABBCC-DDEEFF 001122'), 'aabbccddeeff001122');
  assert.ok(isValidInviteCode('AABBCC-DDEEFF-001122'));
  assert.ok(!isValidInviteCode('aabbccddeeff00112'));
  assert.ok(!isValidInviteCode('gabbccddeeff001122'));
  assert.equal(formatInviteCode('aabbccddeeff001122'), 'aabbcc-ddeeff-001122');
});

test('errors: an invite refusal (generic 500) gets the invitation message, not a raw error', () => {
  assert.match(signUpErrorMessage({ status: 500, message: 'Database error saving new user' }), /invitation code/);
  assert.match(signUpErrorMessage({ message: 'User already registered' }), /already exists/);
  assert.match(signUpErrorMessage({ code: 'email_address_not_authorized', message: 'Email address not authorized' }), /email setup/);
  assert.match(signInErrorMessage({ code: 'invalid_credentials', message: 'Invalid login credentials' }), /incorrect/);
  assert.match(signInErrorMessage({ message: 'Email not confirmed' }), /Confirm your email/);
  assert.equal(dataErrorMessage({ code: '42501', message: 'new row violates row-level security policy' }), 'You do not have permission to do that.');
  assert.equal(dataErrorMessage(null), '');
});

test('text: lesson bodies parse into headings, paragraphs and lists — no HTML', () => {
  const blocks = parseBody('# Title\n\nFirst line\nsame paragraph\n\n- one\n- two\n\n1. a\n2) b\n\n<script>x</script>');
  assert.deepEqual(blocks, [
    { kind: 'heading', level: 1, text: 'Title' },
    { kind: 'paragraph', text: 'First line same paragraph' },
    { kind: 'list', ordered: false, items: ['one', 'two'] },
    { kind: 'list', ordered: true, items: ['a', 'b'] },
    { kind: 'paragraph', text: '<script>x</script>' },
  ]);
  assert.deepEqual(parseBody(null), []);
});

test('text: only http(s) URLs are linkable; slugs are URL-safe', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('data:text/html,x'), null);
  assert.equal(safeUrl('not a url'), null);
  assert.equal(safeUrl('https://example.org/a'), 'https://example.org/a');
  assert.equal(slugify('  Budget Basics: Week 1! '), 'budget-basics-week-1');
  assert.equal(slugify('Café & Crédit'), 'cafe-credit');
  // Cut at 60 on a separator: the slug still ends on a letter or digit.
  const long = slugify(`${'a'.repeat(59)} b`);
  assert.equal(long, 'a'.repeat(59));
  assert.ok(!slugify(`${'word '.repeat(20)}`).endsWith('-'));
});

test('routes: parse and format round-trip', () => {
  for (const h of ['#/', '#/learn', '#/learn/money-credit-systems', '#/learn/t/m', '#/plans', '#/plans/abc', '#/support', '#/staff/content', '#/status']) {
    assert.equal(href(parseRoute(h)), h);
  }
  assert.deepEqual(parseRoute('#/staff/bogus'), { name: 'staff', section: 'invites' });
  assert.deepEqual(parseRoute('#/nope'), { name: 'not-found', path: 'nope' });
  assert.deepEqual(parseRoute(''), { name: 'dashboard' });
});

test('routes: Supabase auth fragments are recognised', () => {
  assert.ok(isAuthFragment('#access_token=abc&type=recovery'));
  assert.ok(isAuthFragment('#error=access_denied&error_description=x'));
  assert.ok(!isAuthFragment('#/learn'));
});

test('config: needs an https supabase.co URL and a key; never falls back to a guess', () => {
  assert.equal(readConfig({}), null);
  assert.equal(readConfig({ VITE_SUPABASE_URL: 'http://x.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx' }), null);
  assert.equal(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'short' }), null);
  assert.deepEqual(readConfig({ VITE_SUPABASE_URL: 'https://abc.supabase.co/', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxx' }), {
    supabaseUrl: 'https://abc.supabase.co', publishableKey: 'sb_publishable_xxxxxxxxxxxxxxxx',
  });
});

test('config: auth emails return members to this app path', () => {
  assert.equal(appBaseUrl({ origin: 'https://khu-el.github.io', pathname: '/Khu-el/member-portal/' }), 'https://khu-el.github.io/Khu-el/member-portal/');
  assert.equal(appBaseUrl({ origin: 'https://khu-el.github.io', pathname: '/Khu-el/member-portal/index.html' }), 'https://khu-el.github.io/Khu-el/member-portal/');
});

test('pathways: plural rules keep "business", "process" and "strategy" whole', () => {
  for (const [w, s] of [['business', 'business'], ['businesses', 'business'], ['processes', 'process'], ['strategies', 'strategy'], ['taxes', 'tax'], ['budgets', 'budget'], ['ai', 'ai'], ['credit', 'credit']]) {
    assert.equal(stem(w), s, w);
  }
});
