/**
 * Module 08 · the slot rule.
 *
 * The ceiling is 10, not 15, and a task with two run times consumes two slots.
 * Both halves of that are easy to lose: the ceiling by copying the register's
 * own length, and the doubling by counting rows instead of runs.
 *
 * A task whose run times are not in the workspace still consumes at least one
 * slot — an unknown task is not a free task, and rounding it to zero would
 * make an over-capacity register look like it fits.
 */

export const SLOT_CEILING = 10

export interface ScheduledTask {
  id: string
  /** null where the source register is not in this workspace. */
  title: string | null
  cadence: string | null
  /** null where unknown. A known task with two run times consumes two slots. */
  runTimes: string[] | null
  owningSurface: string | null
}

export interface SlotCount {
  consumed: number
  ceiling: number
  overBy: number
  overCapacity: boolean
  /** Tasks whose run times are unknown, and therefore counted as one each. */
  assumedSingle: string[]
}

export function slotsFor(task: ScheduledTask): number {
  if (task.runTimes === null) return 1
  return Math.max(1, task.runTimes.length)
}

export function countSlots(tasks: ScheduledTask[]): SlotCount {
  const consumed = tasks.reduce((sum, t) => sum + slotsFor(t), 0)
  return {
    consumed,
    ceiling: SLOT_CEILING,
    overBy: Math.max(0, consumed - SLOT_CEILING),
    overCapacity: consumed > SLOT_CEILING,
    assumedSingle: tasks.filter((t) => t.runTimes === null).map((t) => t.id),
  }
}
