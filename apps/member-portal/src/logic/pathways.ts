// Keyword router from a member's stated goal to opportunity pathways.
// Pure: no imports beyond types, so `node --test` runs it directly.
import type { OpportunityPathway } from '../types.ts';

export interface PathwayMatch {
  pathway: OpportunityPathway;
  score: number;
  matched: string[];
}

const STOP = new Set(['a', 'an', 'and', 'the', 'to', 'of', 'for', 'in', 'on', 'my', 'i', 'me', 'want', 'with', 'how', 'into', 'more', 'get', 'be', 'is', 'it', 'or']);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** Light stemming so "budgeting" meets "budget" and "businesses" meets "business". */
export function stem(token: string): string {
  const t = token;
  if (t.length > 6 && t.endsWith('ing')) return t.slice(0, -3);
  if (t.length > 5 && t.endsWith('ed')) return t.slice(0, -2);
  if (t.endsWith('sses')) return t.slice(0, -2); // processes -> process, businesses -> business
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`; // strategies -> strategy
  if (t.length > 4 && /(x|z|ch|sh)es$/.test(t)) return t.slice(0, -2); // taxes -> tax
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1); // budgets -> budget, but business stays
  return t;
}

/**
 * Score each active pathway by how many of its keywords the goal mentions.
 * Ties break on sort_order. A goal that matches nothing returns [] -- the UI
 * then offers every pathway rather than guessing one.
 */
export function matchPathways(goal: string, pathways: OpportunityPathway[], limit = 3): PathwayMatch[] {
  const goalStems = new Set(tokenize(goal).map(stem));
  if (goalStems.size === 0) return [];
  const matches: PathwayMatch[] = [];
  for (const pathway of pathways) {
    if (!pathway.is_active) continue;
    const matched = pathway.keywords.filter((k) => goalStems.has(stem(k.toLowerCase())));
    if (matched.length > 0) matches.push({ pathway, score: matched.length, matched });
  }
  matches.sort((a, b) => b.score - a.score || a.pathway.sort_order - b.pathway.sort_order);
  return matches.slice(0, limit);
}

/** The copy of the pathway saved with a blueprint, so later edits to the catalog do not rewrite history. */
export function pathwaySnapshot(p: OpportunityPathway): Record<string, unknown> {
  return {
    id: p.id,
    title: p.title,
    summary: p.summary,
    destination_type: p.destination_type,
    destination_id: p.destination_id,
  };
}
