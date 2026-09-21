/**
 * The network gates' matchers.
 *
 * Written as .mjs on purpose. This file has to name the strings the gates hunt
 * for, and check-network.mjs reads .ts/.tsx/.css/.html — so as a .ts it flagged
 * itself. The scanner already exempts its own source for the same reason;
 * putting the test outside the scanned extensions needs no EXEMPT entry, and
 * neither guard script's EXEMPT list has been touched.
 *
 * Review found three holes here, each confirmed by probe before it was fixed.
 * The probes are now cases, so the holes cannot reopen quietly:
 *
 *   - a prefix local-host exemption passed http://localhost.evil.example/
 *   - scheme-relative URLs matched nothing at all
 *   - a prefix inert list vouched for every URL under an accounted host
 */
import { describe, expect, it } from 'vitest'
import {
  cssUrl,
  htmlRemoteAttr,
  remoteUrl,
  requestingCalls,
  schemeRelativeUrl,
} from '../scripts/network-patterns.mjs'

const hits = (re, text) => text.match(re) ?? []

describe('the local-host exemption matches a whole authority', () => {
  it('flags a hostname that merely starts with a local one', () => {
    for (const url of [
      'http://localhost.evil.example/collect',
      'https://localhost-evil.example/x',
      'http://127.0.0.1.evil.example/x',
    ]) {
      expect(hits(remoteUrl(), url), url).toHaveLength(1)
    }
  })

  it('leaves a genuine local origin alone, with or without a port', () => {
    for (const url of [
      'http://localhost/',
      'http://localhost:5173/',
      'http://127.0.0.1:4000/api',
      'http://[::1]:8080/',
      "'http://localhost:5173'",
    ]) {
      expect(hits(remoteUrl(), url), url).toHaveLength(0)
    }
  })

  it('flags an ordinary remote origin', () => {
    expect(hits(remoteUrl(), 'https://cdn.example.com/f.js')).toHaveLength(1)
  })
})

describe('scheme-relative URLs are seen', () => {
  it('flags a host that follows the slashes', () => {
    for (const text of [
      "const u = '//evil.example/beacon.js'",
      '<script src="//cdn.example.com/x.js">',
      'url(//evil.example/p.gif)',
    ]) {
      expect(hits(schemeRelativeUrl(), text), text).not.toHaveLength(0)
    }
  })

  it('does not fire on a comment, a path, or the tail of an absolute URL', () => {
    for (const text of [
      'const x = 1 // see example.com for details',
      "import y from '../../core/types'",
      "const u = 'https://example.com/a'",
      'a // b',
      '// TODO: revisit',
    ]) {
      expect(hits(schemeRelativeUrl(), text), text).toHaveLength(0)
    }
  })
})

describe('a URL in a CSS url() is a request whatever the string is', () => {
  it('flags it even under a host the inert list accounts for', () => {
    const found = [...'.p { background: url(https://reactjs.org/pixel); }'.matchAll(cssUrl())]
    expect(found).toHaveLength(1)
    expect(found[0][1]).toBe('https://reactjs.org/pixel')
  })

  it('flags a scheme-relative one, quoted or bare', () => {
    for (const css of [
      'url(//evil.example/p.gif)',
      "url('//evil.example/p.gif')",
      'url( "https://evil.example/p.gif" )',
    ]) {
      expect([...css.matchAll(cssUrl())], css).toHaveLength(1)
    }
  })

  it('leaves a local or data URL alone', () => {
    for (const css of ['url(data:image/png;base64,AAA)', 'url(/assets/x.png)']) {
      expect([...css.matchAll(cssUrl())], css).toHaveLength(0)
    }
  })
})

describe('HTML attributes are checked before any script runs', () => {
  it('flags an absolute and a scheme-relative src or href', () => {
    for (const tag of [
      '<script src="https://cdn.example.com/x.js">',
      '<link href="//fonts.example.com/c.css">',
    ]) {
      expect(hits(htmlRemoteAttr(), tag), tag).toHaveLength(1)
    }
  })

  it('leaves a same-origin reference alone', () => {
    expect(hits(htmlRemoteAttr(), '<script src="/src/main.tsx">')).toHaveLength(0)
  })
})

describe('request-capable calls have no exemption list', () => {
  it('flags each of them', () => {
    const cases = [
      ['fetch(url)', 'fetch()'],
      ['new XMLHttpRequest()', 'XMLHttpRequest'],
      ['navigator.sendBeacon(u)', 'sendBeacon'],
      ['new WebSocket(u)', 'WebSocket'],
      ['new EventSource(u)', 'EventSource'],
      ['importScripts(u)', 'importScripts'],
    ]
    for (const [text, what] of cases) {
      const pattern = requestingCalls().find((p) => p.what === what)
      expect(hits(pattern.re, text), text).not.toHaveLength(0)
    }
  })

  it('does not fire on a name that merely contains one', () => {
    const fetchPattern = requestingCalls().find((p) => p.what === 'fetch()')
    expect(hits(fetchPattern.re, 'fetchLike(u)')).toHaveLength(0)
    expect(hits(fetchPattern.re, 'prefetchAll(u)')).toHaveLength(0)
  })
})

describe('each matcher is stateless between calls', () => {
  it('returns a fresh expression so lastIndex cannot skip a match', () => {
    // A shared /g expression carries lastIndex, which makes a scanner miss
    // every other occurrence. Each export is a factory for this reason.
    for (let i = 0; i < 3; i++) {
      expect(hits(remoteUrl(), 'https://example.com/a')).toHaveLength(1)
      expect(hits(schemeRelativeUrl(), '//example.com/a')).toHaveLength(1)
    }
  })
})
