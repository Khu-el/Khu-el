/**
 * Module 02 · the three arithmetic rules, kept out of the component.
 *
 * They are here rather than inline in JSX because each one is a rule the spec
 * states in prose and each one is easy to get wrong quietly. A total that
 * silently absorbed an unverified figure would look exactly like a correct
 * total, so the rule is a function with a test rather than a line of markup.
 */

export type Scenario = 'conservative' | 'base' | 'aggressive'

export interface Projection {
  id: string
  label: string
  /** A number without a scenario is not a projection. */
  scenario: Scenario
  modelValue: number
  /** The plan's figure, where a plan states one. */
  planValue: number | null
  model: string
  /** false marks a placeholder: unverified, and out of every roll-up. */
  verified: boolean
}

export interface Placeholder {
  cell: string
  label: string
  value: number
  scenario: string
  verified: false
}

/**
 * Which figure governs, and why.
 *
 * Where a plan and a model disagree the model governs — but the row has to say
 * so, because a governed figure that looks like an agreed figure is how the
 * plan's number quietly comes back. Averaging them is not an option and
 * silently picking one is the failure this exists to prevent.
 */
export function governing(p: Projection): {
  value: number
  source: 'model' | 'agreed'
  disagrees: boolean
  note: string | null
} {
  if (p.planValue === null) {
    return {
      value: p.modelValue,
      source: 'model',
      disagrees: false,
      note: null,
    }
  }
  if (p.planValue === p.modelValue) {
    return { value: p.modelValue, source: 'agreed', disagrees: false, note: null }
  }
  return {
    value: p.modelValue,
    source: 'model',
    disagrees: true,
    note: `Plan states ${p.planValue}; model states ${p.modelValue}. The model governs. The two have not been averaged and the plan figure has not been dropped — it is recorded here so the disagreement stays visible.`,
  }
}

export interface RollUp {
  total: number
  included: string[]
  excluded: { id: string; value: number; reason: string }[]
}

/**
 * Sum only what is verified, and name what was left out.
 *
 * An unverified figure never enters a total, not even a subtotal. The excluded
 * list is returned rather than logged because a total that quietly dropped a
 * row is as misleading as one that quietly absorbed it.
 */
export function rollUp(
  projections: Projection[],
  scenario: Scenario,
): RollUp {
  const inScope = projections.filter((p) => p.scenario === scenario)
  const result: RollUp = { total: 0, included: [], excluded: [] }

  for (const p of inScope) {
    if (!p.verified) {
      result.excluded.push({
        id: p.id,
        value: p.modelValue,
        reason: 'unverified — not a real figure',
      })
      continue
    }
    result.total += governing(p).value
    result.included.push(p.id)
  }
  return result
}

/** Placeholders are projections that never qualify. Stated once, here. */
export function placeholderAsProjection(
  p: Placeholder,
  model: string,
): Projection {
  return {
    id: `${model}:${p.cell}`,
    label: `${p.label} (${p.cell})`,
    scenario: 'base',
    modelValue: p.value,
    planValue: null,
    model,
    verified: false,
  }
}

/** The capital ask must equal the sum of its tranches or one of them is wrong. */
export function tranchesReconcile(
  ask: number,
  tranches: { amount: number }[],
): boolean {
  return tranches.reduce((sum, t) => sum + t.amount, 0) === ask
}
