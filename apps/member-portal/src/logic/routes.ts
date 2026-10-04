// Hash routing: the app is served from a static subpath on GitHub Pages, so
// routes live after "#". Supabase's own auth fragments ("#access_token=...")
// are recognised and left to the Supabase client.

export type Route =
  | { name: 'dashboard' }
  | { name: 'learn' }
  | { name: 'track'; trackId: string }
  | { name: 'module'; trackId: string; moduleId: string }
  | { name: 'resources' }
  | { name: 'pathways' }
  | { name: 'plans' }
  | { name: 'plan'; planId: string }
  | { name: 'support' }
  | { name: 'notifications' }
  | { name: 'account' }
  | { name: 'status' }
  | { name: 'staff'; section: 'invites' | 'support' | 'content' }
  | { name: 'not-found'; path: string };

export function isAuthFragment(hash: string): boolean {
  return /(^|[#&])(access_token|error_description|error|type)=/.test(hash);
}

/**
 * Whether the Supabase client may take a session from the URL (its
 * `detectSessionInUrl` check, given the parsed URL parameters). A link carrying
 * tokens is refused while this browser already holds a saved session, so a
 * forwarded link can never silently swap the signed-in account for someone
 * else's. Error-only fragments keep Supabase's default handling.
 */
export function acceptUrlSession(params: Record<string, string>, sessionStored: boolean): boolean {
  if (params.access_token) return !sessionStored;
  return Boolean(params.error || params.error_description || params.error_code);
}

/** decodeURIComponent, or null for a malformed escape ("%", "%E0%A4%A") instead of a throw. */
function decodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/** Never throws: a segment that cannot be decoded is a broken link, so it is "not-found". */
export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const parts: string[] = [];
  for (const segment of path.split('/').filter(Boolean)) {
    const decoded = decodeSegment(segment);
    if (decoded === null) return { name: 'not-found', path };
    parts.push(decoded);
  }
  switch (parts[0] ?? '') {
    case '':
    case 'dashboard':
      return { name: 'dashboard' };
    case 'learn':
      if (parts[1] && parts[2]) return { name: 'module', trackId: parts[1], moduleId: parts[2] };
      if (parts[1]) return { name: 'track', trackId: parts[1] };
      return { name: 'learn' };
    case 'resources':
      return { name: 'resources' };
    case 'pathways':
      return { name: 'pathways' };
    case 'plans':
      return parts[1] ? { name: 'plan', planId: parts[1] } : { name: 'plans' };
    case 'support':
      return { name: 'support' };
    case 'notifications':
      return { name: 'notifications' };
    case 'account':
      return { name: 'account' };
    case 'status':
      return { name: 'status' };
    case 'staff': {
      const section = parts[1] === 'support' || parts[1] === 'content' ? parts[1] : 'invites';
      return { name: 'staff', section };
    }
    default:
      return { name: 'not-found', path };
  }
}

export function href(route: Route): string {
  const enc = encodeURIComponent;
  switch (route.name) {
    case 'dashboard':
      return '#/';
    case 'track':
      return `#/learn/${enc(route.trackId)}`;
    case 'module':
      return `#/learn/${enc(route.trackId)}/${enc(route.moduleId)}`;
    case 'plan':
      return `#/plans/${enc(route.planId)}`;
    case 'staff':
      return `#/staff/${route.section}`;
    case 'not-found':
      return `#/${route.path}`;
    default:
      return `#/${route.name}`;
  }
}
