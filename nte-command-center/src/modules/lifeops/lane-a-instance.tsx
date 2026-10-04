/** Module 08 · enterprise instance. Imports exactly one seed. */

import React from 'react'
import type { Surface } from '../../core/types'
import { Lifeops, type LifeopsView } from './shared'
import seed from '../../../seed/lifeops-lane-a.json'

export function LaneAInstance({ surface }: { surface: Surface }) {
  const view: LifeopsView = {
    note: seed.opsNote,
    systems: seed.opsSystemsOfRecord.map((s) => ({
      domain: s.sorDomain,
      system: s.sorSystem,
    })),
    systemsNote: seed.opsSystemsNote,
    domains: seed.opsDomains.map((d) => ({
      ref: d.domainRef,
      name: d.domainName,
      tool: d.domainTool,
      numbersBarred: d.domainNumbersBarred,
      cadence: 'domainCadence' in d ? (d.domainCadence as string) : undefined,
      note: 'domainNote' in d ? (d.domainNote as string) : undefined,
    })),
    domainsNote: seed.opsDomainsNote,
    cadences: seed.opsCadences,
    tasks: seed.opsTasks.map((t) => ({
      id: t.taskRef,
      title: t.taskName,
      cadence: t.taskCadence,
      runTimes: t.taskRunTimes,
      owningSurface: t.taskOwner,
    })),
    tasksNote: seed.opsTasksNote,
    collision: {
      title: seed.opsCollision.collisionTitle,
      detail: seed.opsCollision.collisionDetail,
      consequence: seed.opsCollision.collisionConsequence,
      resolution: seed.opsCollision.collisionResolution,
      state: seed.opsCollision.collisionState,
    },
  }
  return <Lifeops view={view} surface={surface} />
}
