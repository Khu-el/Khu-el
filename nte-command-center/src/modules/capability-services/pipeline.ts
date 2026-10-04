/**
 * Module 09 · the two gates, kept out of the component.
 *
 * Both are computed across the whole set rather than decided per row. A
 * per-product hard-coding drifts the first time a product is added, and the
 * drift is silent: the new product simply renders available.
 */

export const FORECAST_STAGE = 5

/** The four the Field Edition requires before a deal enters the forecast. */
export const FORECAST_CRITERIA = [
  'realProblem',
  'realConsequence',
  'identifiedStakeholder',
  'scheduledNextStep',
] as const

export type ForecastCriterion = (typeof FORECAST_CRITERIA)[number]

export interface Deal {
  id: string
  name: string
  stage: number
  criteria: Record<ForecastCriterion, boolean>
}

export function emptyCriteria(): Record<ForecastCriterion, boolean> {
  return {
    realProblem: false,
    realConsequence: false,
    identifiedStakeholder: false,
    scheduledNextStep: false,
  }
}

export interface AdvanceResult {
  ok: boolean
  deal: Deal
  message: string
}

/**
 * Move a deal one stage on, or refuse.
 *
 * Stage five is the forecast gate. All four criteria, or the deal does not
 * enter the forecast — three of four is not a forecast, it is a hope with a
 * date on it. The refusal names which are missing so the answer is actionable
 * rather than just a no.
 */
export function advance(deal: Deal, stages: number): AdvanceResult {
  if (deal.stage >= stages) {
    return { ok: false, deal, message: `${deal.name} is at the last stage.` }
  }

  const crossingForecast = deal.stage === FORECAST_STAGE
  if (crossingForecast) {
    const missing = FORECAST_CRITERIA.filter((c) => !deal.criteria[c])
    if (missing.length > 0) {
      return {
        ok: false,
        deal,
        message:
          `${deal.name} stays at stage ${FORECAST_STAGE}. The forecast gate ` +
          `needs all four: ${missing.join(', ')} ${
            missing.length === 1 ? 'is' : 'are'
          } not checked. Three of four is not a forecast.`,
      }
    }
  }

  return {
    ok: true,
    deal: { ...deal, stage: deal.stage + 1 },
    message: `${deal.name} moved to stage ${deal.stage + 1}.`,
  }
}

// ── The separation protocol ───────────────────────────────────────────────

export interface ServiceProduct {
  id: string
  name: string | null
  ladderPosition: number | null
  price: number | null
  entityRouting: string | null
  /**
   * Does this product touch the estate-education / insurance-licence
   * adjacency the separation protocol covers? UNKNOWN counts as yes: an
   * unclassified product is not a product that has been cleared.
   */
  adjacency: 'TOUCHES' | 'CLEAR' | 'UNKNOWN'
  /** Has the scope been checked against the excluded register? */
  scopeReviewed: boolean
  /** Excluded-register ids this product's scope was found to reach. */
  exclusionsReached: string[]
}

export interface Availability {
  available: boolean
  blockedBy: string[]
}

/**
 * Whether a product may render as available.
 *
 * Computed from the product and the protocol's signature state, never
 * hard-coded per product. Three ways to be blocked and any one is enough:
 * the protocol is unsigned and this product touches what it covers; the
 * scope has not been checked against the excluded register; or the scope
 * reaches an excluded line, which is not a gate at all — it is a closed line.
 */
export function availability(
  product: ServiceProduct,
  protocolSigned: boolean,
): Availability {
  const blockedBy: string[] = []

  if (product.exclusionsReached.length > 0) {
    blockedBy.push(
      `Reaches the excluded register (${product.exclusionsReached.join(
        ', ',
      )}). Not a gate — a closed line. This does not open.`,
    )
  }
  if (!product.scopeReviewed) {
    blockedBy.push(
      'Scope has not been checked against the excluded register. Unchecked is not clear.',
    )
  }
  if (!protocolSigned && product.adjacency !== 'CLEAR') {
    blockedBy.push(
      product.adjacency === 'UNKNOWN'
        ? 'CP-8 is unsigned and this product is unclassified. An unclassified product is not a cleared one.'
        : 'CP-8 is unsigned and this product touches what it covers.',
    )
  }

  return { available: blockedBy.length === 0, blockedBy }
}

/** How many products the protocol is currently blocking, across the set. */
export function blockedByProtocol(
  products: ServiceProduct[],
  protocolSigned: boolean,
): string[] {
  return products
    .filter((p) => !availability(p, protocolSigned).available)
    .map((p) => p.id)
}
