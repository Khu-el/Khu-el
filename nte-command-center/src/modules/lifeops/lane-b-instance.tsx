/** Module 08 · household instance. Imports exactly one seed. */

import React from 'react'
import type { Surface } from '../../core/types'
import { Lifeops, type LifeopsView } from './shared'
import seed from '../../../seed/lifeops-lane-b.json'

export function LaneBInstance({ surface }: { surface: Surface }) {
  const view: LifeopsView = {
    note: seed.houseNote,
    systems: seed.houseSystemsOfRecord.map((s) => ({
      domain: s.recordDomain,
      system: s.recordSystem,
    })),
    systemsNote: seed.houseSystemsNote,
    domains: seed.houseDomains.map((d) => ({
      ref: d.areaRef,
      name: d.areaName,
      tool: d.areaTool,
      numbersBarred: d.areaNumbersBarred,
      cadence: 'areaCadence' in d ? (d.areaCadence as string) : undefined,
      note: 'areaNote' in d ? (d.areaNote as string) : undefined,
    })),
    domainsNote: seed.houseDomainsNote,
    cadences: seed.houseCadences,
    tasks: seed.houseTasks.map((t) => ({
      id: t.jobRef,
      title: t.jobName,
      cadence: t.jobCadence,
      runTimes: t.jobRunTimes,
      owningSurface: t.jobOwner,
    })),
    tasksNote: seed.houseTasksNote,
    collision: {
      title: seed.houseCollision.clashTitle,
      detail: seed.houseCollision.clashDetail,
      consequence: seed.houseCollision.clashConsequence,
      resolution: seed.houseCollision.clashResolution,
      state: seed.houseCollision.clashState,
    },
  }
  return <Lifeops view={view} surface={surface} />
}
