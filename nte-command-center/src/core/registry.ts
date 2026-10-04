/**
 * Module registry.
 *
 * A surface renders only the modules whose `surfaces` array includes it.
 * Nothing else routes. Adding a module means adding one import here — if a
 * module is not in this array it does not exist to the app, which keeps the
 * firewall auditable from a single file.
 *
 * All eleven modules are built. `src/modules/stub.tsx` stays in the tree for
 * the next one: a module with a spec and no implementation renders what it
 * needs rather than a blank panel, because an empty screen is
 * indistinguishable from a broken one.
 */

import type { ModuleDefinition, Surface } from './types'
import governance from '../modules/gov-infrastructure'
import ventures from '../modules/ventures-revenue'
import education from '../modules/education-nvu'
import marketing from '../modules/marketing-content'
import compliance from '../modules/compliance-cp'
import techStack from '../modules/tech-stack'
import practiceDesk from '../modules/practice-desk'
import familyOffice from '../modules/family-office'
import lifeops from '../modules/lifeops'
import capability from '../modules/capability-services'
import knowledge from '../modules/knowledge-canon'

export const SURFACES: Record<Surface, { label: string; seal: string }> = {
  'lane-a': { label: 'Enterprise', seal: 'Lane A' },
  'lane-b': { label: 'Household', seal: 'Lane B' },
  practice: { label: 'Practice', seal: 'Practice desk' },
}

export const MODULES: ModuleDefinition[] = [
  governance,
  ventures,
  education,
  marketing,
  techStack,
  practiceDesk,
  familyOffice,
  lifeops,
  capability,
  compliance,
  knowledge,
]

export function modulesFor(surface: Surface): ModuleDefinition[] {
  return MODULES.filter((m) => m.surfaces.includes(surface)).sort((a, b) =>
    a.ordinal.localeCompare(b.ordinal),
  )
}

export function moduleById(id: string): ModuleDefinition | undefined {
  return MODULES.find((m) => m.id === id)
}
