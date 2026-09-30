/**
 * The network gates' matchers. One copy, imported by check-network.mjs (source)
 * and check-bundle.mjs (built output).
 *
 * Extracted so they can be tested directly. Three holes were found by review in
 * the inline versions, each verified by probe before it was fixed:
 *
 *   - The local-host exemption was a prefix, so http://localhost.evil.example/
 *     reported "External origins: none."
 *   - Scheme-relative URLs (//host/path) carry no "http" and matched nothing.
 *   - The built-output inert list matched by prefix, so any URL under an
 *     accounted host was vouched for by a reason that did not cover it.
 */

/** Exactly a local authority, optional port, then a delimiter or end of line. */
const LOCAL_AUTHORITY = String.raw`(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?=[/?#"'\s\\]|$)`

/** A remote absolute URL: any scheme+authority that is not exactly local. */
export const remoteUrl = () =>
  new RegExp(String.raw`https?://(?!${LOCAL_AUTHORITY})`, 'g')

/**
 * A scheme-relative URL. The host must follow the slashes immediately, so an
 * inline comment ("// see example.com") is not a match, and a preceding colon
 * or word character rules out the tail of an absolute URL or a path.
 */
export const schemeRelativeUrl = () =>
  /(?<![:A-Za-z0-9.\-])\/\/[A-Za-z0-9][A-Za-z0-9.\-]*\.[A-Za-z]{2,}[^)'"\s]*/g

/**
 * A URL inside a CSS url(). The browser fetches it with no script involved, so
 * it is a request however inert the string would otherwise be — which is why
 * this is judged before any inert list is consulted.
 */
export const cssUrl = () => /url\(\s*['"]?((?:https?:)?\/\/[^)'"\s]+)/gi

/** An external origin in an HTML src/href, fetched before any script runs. */
export const htmlRemoteAttr = () => /(?:src|href)="(?:https?:)?\/\/[^"]+"/g

/** Request-capable calls. A hit is a failure with no exceptions and no list. */
export const requestingCalls = () => [
  { re: /\bfetch\s*\(/g, what: 'fetch()' },
  { re: /XMLHttpRequest/g, what: 'XMLHttpRequest' },
  { re: /sendBeacon/g, what: 'sendBeacon' },
  { re: /new [A-Za-z_$]{0,3}WebSocket|\bWebSocket\s*\(/g, what: 'WebSocket' },
  { re: /EventSource\s*\(/g, what: 'EventSource' },
  { re: /importScripts\s*\(/g, what: 'importScripts' },
]
