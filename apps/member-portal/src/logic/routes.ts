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

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean).map((p) => decodeURIComponent(p));
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
