import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptUrlSession, href, isAuthFragment, parseRoute } from '../src/logic/routes.ts';

test('routes: a malformed percent-escape is "not-found", never a throw', () => {
  for (const [hash, path] of [
    ['#/plans/%', 'plans/%'],
    ['#/learn/%E0%A4%A', 'learn/%E0%A4%A'],
    ['#/learn/100%', 'learn/100%'],
    ['#/learn/t/%zz', 'learn/t/%zz'],
    ['#/%', '%'],
  ]) {
    assert.ok(!isAuthFragment(hash), hash);
    assert.deepEqual(parseRoute(hash), { name: 'not-found', path }, hash);
  }
  // The not-found route formats back to the hash it came from.
  assert.equal(href(parseRoute('#/plans/%')), '#/plans/%');
});

test('routes: well-formed escapes still decode', () => {
  assert.deepEqual(parseRoute('#/learn/a%20b'), { name: 'track', trackId: 'a b' });
  assert.deepEqual(parseRoute('#/learn/a%2Fb/m'), { name: 'module', trackId: 'a/b', moduleId: 'm' });
  assert.equal(href(parseRoute('#/learn/a%2Fb/m')), '#/learn/a%2Fb/m');
});

test('auth: a URL session is taken only when no session is saved here', () => {
  const link = { access_token: 'a', refresh_token: 'r', expires_in: '3600', token_type: 'bearer' };
  assert.equal(acceptUrlSession(link, false), true);
  assert.equal(acceptUrlSession(link, true), false);
  // A recovery link is refused the same way: it would still switch the account.
  assert.equal(acceptUrlSession({ ...link, type: 'recovery' }, false), true);
  assert.equal(acceptUrlSession({ ...link, type: 'recovery' }, true), false);
});

test('auth: error fragments keep the default handling; anything else is not a callback', () => {
  assert.equal(acceptUrlSession({ error: 'access_denied', error_code: 'otp_expired' }, false), true);
  assert.equal(acceptUrlSession({ error_description: 'expired' }, true), true);
  assert.equal(acceptUrlSession({}, false), false);
  assert.equal(acceptUrlSession({ type: 'recovery' }, false), false);
});
