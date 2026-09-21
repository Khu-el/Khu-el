/**
 * Module 07 · the two rules that have to hold, kept out of the component.
 *
 * Both are refusals rather than warnings, so both are functions that return a
 * rejection someone can render — not a colour change and not a confirm dialog
 * a person clicks through.
 */

export type CommandState = 'open' | 'carried' | 'closed' | 'dropped'

export interface Command {
  id: string
  title: string
  state: CommandState
  /** How many councils this has been carried across. */
  carries: number
  opened: string
  /** Set when the command was deliberately dropped rather than closed. */
  dropReason?: string
}

export const CARRY_LIMIT = 2

export interface CarryResult {
  ok: boolean
  commands: Command[]
  message: string
}

/**
 * Carry a command to the next council, or refuse.
 *
 * No more than two commands carry at once. A third is not a warning and not a
 * confirmation — it is refused, and the way past it is to close one or drop
 * one on purpose. A list that carries everything forever is a list nobody
 * reads, which is the failure the limit exists to prevent.
 */
export function attemptCarry(commands: Command[], id: string): CarryResult {
  const target = commands.find((c) => c.id === id)
  if (!target) {
    return { ok: false, commands, message: `No command ${id}.` }
  }
  if (target.state === 'carried') {
    return {
      ok: false,
      commands,
      message: `${id} is already carried.`,
    }
  }

  const carrying = commands.filter((c) => c.state === 'carried')
  if (carrying.length >= CARRY_LIMIT) {
    return {
      ok: false,
      commands,
      message:
        `Two commands are already carried (${carrying
          .map((c) => c.id)
          .join(', ')}). A third is not accepted. Close one or drop one on ` +
        `purpose, then carry this. Carrying everything forward is how a list ` +
        `stops being read.`,
    }
  }

  return {
    ok: true,
    commands: commands.map((c) =>
      c.id === id ? { ...c, state: 'carried', carries: c.carries + 1 } : c,
    ),
    message: `${id} carried to the next council.`,
  }
}

export function closeCommand(commands: Command[], id: string): Command[] {
  return commands.map((c) => (c.id === id ? { ...c, state: 'closed' } : c))
}

export function dropCommand(
  commands: Command[],
  id: string,
  reason: string,
): Command[] {
  return commands.map((c) =>
    c.id === id ? { ...c, state: 'dropped', dropReason: reason } : c,
  )
}

/**
 * Whether a set of rows may be exported.
 *
 * A youth record never leaves this console. The rule is enforced here, in the
 * function that would do the exporting, so that a panel which forgot to
 * disable its button still cannot produce a file.
 */
export function canExport(rows: { youth?: boolean }[]): boolean {
  return !rows.some((r) => r.youth)
}

export function exportRows(rows: { youth?: boolean }[]): string {
  if (!canExport(rows)) {
    throw new Error(
      'Export refused: this set contains a youth record. Youth records are ' +
        'not exportable from this console, by any path.',
    )
  }
  return JSON.stringify(rows)
}
