/**
 * Module 04 · the enterprise instance.
 *
 * Imports exactly one seed. The practice seed is not reachable from this file,
 * directly or transitively — which is the whole mechanism behind "shared code,
 * never shared data."
 */

import React from 'react'
import type { Surface } from '../../core/types'
import { MarketingContent, type MarketingView } from './shared'
import seed from '../../../seed/marketing-lane-a.json'

export function LaneAInstance({ surface }: { surface: Surface }) {
  const view: MarketingView = {
    note: seed.imprintNote,
    calendarLabel: seed.imprintCalendar.cadenceLabel,
    calendarNote: seed.imprintCalendar.columnNote,
    weeks: seed.imprintCalendar.columns.map((c) => ({
      label: c.weekLabel,
      slots: (c.slotList as { slotTitle: string; slotChannel: string; slotState: string }[]).map(
        (s) => ({ title: s.slotTitle, channel: s.slotChannel, state: s.slotState }),
      ),
    })),
    assets: seed.imprintAssets.map((a) => ({
      ref: a.assetRef,
      name: a.assetName,
      kind: a.assetKind,
      line: a.assetImprint,
      palette: a.assetPalette as 'enterprise' | 'imprint',
      state: a.assetState,
      remark: a.assetRemark,
    })),
    ledger: seed.imprintLedger.map((l) => ({
      ref: l.pubRef,
      date: l.pubDate,
      channel: l.pubChannel,
      entry: l.pubEntry,
    })),
    meterLabel: seed.imprintMeterLabel,
    imprint: {
      name: seed.imprintPalette.paletteName,
      selector: seed.imprintPalette.paletteSelector,
      note: seed.imprintPalette.paletteNote,
    },
  }
  return <MarketingContent view={view} surface={surface} />
}
