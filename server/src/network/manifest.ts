/**
 * Read-only inventory of packages that already exist in this repository.
 * It does not start them, call them, or invent a health result.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
}

function readPackage(relativePath: string) {
  const file = path.join(repoRoot(), relativePath, 'package.json');
  if (!existsSync(file)) {
    return { present: false, path: relativePath, runtimeChecked: false as const, status: 'missing' as const };
  }
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as { name?: unknown; version?: unknown; description?: unknown; private?: unknown };
  return {
    present: true,
    path: relativePath,
    name: typeof pkg.name === 'string' ? pkg.name : null,
    version: typeof pkg.version === 'string' ? pkg.version : null,
    description: typeof pkg.description === 'string' ? pkg.description : null,
    private: pkg.private === true,
    runtimeChecked: false as const,
    status: 'present-in-repo' as const,
  };
}

export function repositoryStatus() {
  const appsDir = path.join(repoRoot(), 'apps');
  const apps = existsSync(appsDir)
    ? readdirSync(appsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => readPackage(path.join('apps', entry.name)))
      .sort((a, b) => a.path.localeCompare(b.path))
    : [];
  return {
    source: 'repository manifest',
    probed: false,
    note: 'Names and versions are read from package.json on disk. This response did not start those packages or call them.',
    nvsAgentDesk: { ...readPackage('packages/nvs-agent-desk'), mountedOnThisServer: false },
    apps,
  };
}
