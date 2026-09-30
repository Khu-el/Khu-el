import React from 'react'
import type { ModuleDefinition, Surface } from '../core/types'
import { Panel, Empty } from '../ui/components'

/**
 * A module that has a spec but no implementation yet.
 *
 * It renders what it needs to exist, in the order it needs it. This is
 * deliberate: an empty screen is an invitation to act, and a module that
 * silently renders nothing is indistinguishable from one that is broken.
 */
export function makeStub(config: {
  id: string
  ordinal: string
  title: string
  eyebrow: string
  surfaces: Surface[]
  buildWork: boolean
  needs: string[]
}): ModuleDefinition {
  function Stub({ surface }: { surface: Surface }) {
    return (
      <Panel
        kind="register"
        title={config.title}
        purpose={`Specified in docs/MODULE-SPECS.md § ${config.ordinal}. Not built yet.`}
      >
        <Empty title="Nothing loaded here yet">
          <p>To build this module, work through its spec and supply:</p>
          <ul>
            {config.needs.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p>
            Copy the shape of module 01. Do not invent a second shape.
            {config.surfaces.length > 1 &&
              ' This module is hosted on more than one surface and needs a separate seed file per surface, with no shared keys.'}
          </p>
        </Empty>
      </Panel>
    )
  }

  return {
    id: config.id,
    ordinal: config.ordinal,
    title: config.title,
    eyebrow: config.eyebrow,
    surfaces: config.surfaces,
    buildWork: config.buildWork,
    panels: [],
    Component: Stub,
  }
}
