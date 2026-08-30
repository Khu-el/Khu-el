/**
 * The cross-module acceptance list from the end of docs/MODULE-SPECS.md.
 *
 * Each box is a check that runs, not a box someone ticked after looking. The
 * two that are shell commands are run as shell commands here, on the real
 * tree, so a change that breaks them fails this suite too.
 */
import React from 'react'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'
import { MODULES, SURFACES, modulesFor } from '../src/core/registry'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import { isAttested } from '../src/core/types'
import type { Surface } from '../src/core/types'
import { render, weekWith } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
})

describe('box 1 · check:lanes passes', () => {
  it('runs clean on the real tree', () => {
    const out = execFileSync('node', ['scripts/check-lanes.mjs'], {
      encoding: 'utf8',
    })
    expect(out).toContain('Lane firewall: clear.')
  })
})

describe('box 2 · check:network finds zero remote origins', () => {
  it('runs clean on the real tree', () => {
    const out = execFileSync('node', ['scripts/check-network.mjs'], {
      encoding: 'utf8',
    })
    expect(out).toContain('External origins: none')
    const scan = JSON.parse(readFileSync('seed/network-scan.json', 'utf8'))
    expect(scan.externalRequests).toBe(0)
    expect(scan.findings).toEqual([])
    expect(scan.filesScanned).toBeGreaterThan(20)
  })
})

describe('box 3 · the freeze locks build work and only build work', () => {
  const frozen = freezeStatus(weekWith(0))
  const open = freezeStatus(weekWith(40))

  it('covers every module in the registry', () => {
    expect(MODULES.length).toBe(11)
    expect(MODULES.filter((m) => m.buildWork).length).toBeGreaterThan(0)
    expect(MODULES.filter((m) => !m.buildWork).length).toBeGreaterThan(0)
  })

  for (const module of MODULES) {
    const surface = module.surfaces[0]!
    it(`${module.ordinal} ${module.title} — ${module.buildWork ? 'locks' : 'stays open'} below 40`, () => {
      setSurface(surface)
      const low = render(
        <ModuleBody module={module} surface={surface} status={frozen} />,
      )
      if (module.buildWork) {
        expect(low.text).toContain('Build freeze')
        expect(low.text).toContain('0 of 40 documented contacts logged')
      } else {
        expect(low.text).not.toContain('Build freeze')
      }
      low.unmount()

      const high = render(
        <ModuleBody module={module} surface={surface} status={open} />,
      )
      expect(high.text).not.toContain('Build freeze')
      high.unmount()
    })
  }
})

describe('box 4 · no attested status exists without a proof object', () => {
  function seedFiles(): string[] {
    return readdirSync('seed')
      .filter((f) => f.endsWith('.json'))
      .map((f) => join('seed', f))
  }

  it('checks every seed file in the tree', () => {
    const files = seedFiles()
    expect(files.length).toBeGreaterThan(8)

    const offences: string[] = []
    for (const file of files) {
      const data = JSON.parse(readFileSync(file, 'utf8'))
      const walk = (value: unknown, path: string): void => {
        if (Array.isArray(value)) {
          value.forEach((v, i) => walk(v, `${path}[${i}]`))
        } else if (value && typeof value === 'object') {
          const row = value as Record<string, unknown>
          for (const key of ['status', 'state', 'classification']) {
            const claimed = row[key]
            if (typeof claimed === 'string' && isAttested(claimed) && !row.proof) {
              offences.push(`${file}${path}.${key} = ${claimed}, no proof`)
            }
          }
          for (const [k, v] of Object.entries(row)) walk(v, `${path}.${k}`)
        }
      }
      walk(data, '')
    }
    expect(offences).toEqual([])
  })

  it('would catch one if it were added', () => {
    // Guard against the check passing because it looks at nothing.
    const bad = { rows: [{ docCode: 'X', status: 'FILED' }] }
    const found: string[] = []
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) value.forEach(walk)
      else if (value && typeof value === 'object') {
        const row = value as Record<string, unknown>
        if (typeof row.status === 'string' && isAttested(row.status) && !row.proof) {
          found.push(row.status)
        }
        Object.values(row).forEach(walk)
      }
    }
    walk(bad)
    expect(found).toEqual(['FILED'])
  })

  it('holds the rule at the type level too', () => {
    for (const s of ['EXECUTED', 'FILED', 'SERVED', 'PAID', 'DEPLOYED', 'RELEASED']) {
      expect(isAttested(s)).toBe(true)
    }
    for (const s of ['BUILT', 'DRAFT', 'PARTIAL', 'UNKNOWN', 'CONDITIONAL']) {
      expect(isAttested(s)).toBe(false)
    }
  })
})

describe('box 5 · every surface carries noindex', () => {
  const html = readFileSync('index.html', 'utf8')

  it('declares it once for the document all three surfaces render into', () => {
    expect(html).toMatch(
      /<meta\s+name="robots"\s+content="noindex, nofollow, noarchive, nosnippet"\s*\/?>/,
    )
    expect(html).toContain('referrer')
    expect(html).toContain('no-referrer')
  })

  it('has no second entry point that could miss it', () => {
    const roots = readdirSync('.').filter((f) => f.endsWith('.html'))
    expect(roots).toEqual(['index.html'])
  })

  it('blocks outside origins at the document level as well', () => {
    expect(html).toContain("connect-src 'none'")
    expect(html).toContain("default-src 'self'")
  })
})

describe('the firewall holds across the registry', () => {
  it('routes each module only to surfaces it declares', () => {
    for (const surface of Object.keys(SURFACES) as Surface[]) {
      for (const module of modulesFor(surface)) {
        expect(module.surfaces, `${module.id} on ${surface}`).toContain(surface)
      }
    }
  })

  it('has no module on all three surfaces — there is no combined view', () => {
    for (const module of MODULES) {
      expect(module.surfaces.length, module.id).toBeLessThan(3)
    }
  })

  it('gives every module a distinct ordinal and id', () => {
    expect(new Set(MODULES.map((m) => m.id)).size).toBe(MODULES.length)
    expect(new Set(MODULES.map((m) => m.ordinal)).size).toBe(MODULES.length)
  })

  it('leaves no module stubbed', () => {
    for (const module of MODULES) {
      expect(module.panels.length, `${module.id} declares no panels`).toBeGreaterThan(0)
    }
  })
})
