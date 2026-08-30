/*
 * Module 04 · the desk instance.
 *
 * Imports exactly one seed. The other instance's data is not reachable from
 * this file, directly or transitively. This file sits on a path the firewall
 * scan reads as belonging to this surface, so its comments and identifiers are
 * scanned along with its strings.
 */

import React from 'react'
import type { Surface } from '../../core/types'
import { MarketingContent, type MarketingView } from './shared'
import seed from '../../../seed/marketing-practice.json'

export function PracticeInstance({ surface }: { surface: Surface }) {
  const view: MarketingView = {
    note: seed.deskNote,
    calendarLabel: seed.deskCalendar.rhythmLabel,
    calendarNote: seed.deskCalendar.weekNote,
    weeks: seed.deskCalendar.weeks.map((w) => ({
      label: w.weekName,
      slots: (w.postList as { postTitle: string; postChannel: string; postState: string }[]).map(
        (p) => ({ title: p.postTitle, channel: p.postChannel, state: p.postState }),
      ),
    })),
    assets: seed.deskAssets.map((a) => ({
      ref: a.itemRef,
      name: a.itemName,
      kind: a.itemKind,
      line: a.itemLine,
      palette: 'desk' as const,
      state: a.itemState,
      remark: a.itemRemark,
    })),
    ledger: seed.deskLedger.map((l) => ({
      ref: l.logRef,
      date: l.logDate,
      channel: l.logChannel,
      entry: l.logEntry,
    })),
    meterLabel: seed.deskMeterLabel,
  }
  return <MarketingContent view={view} surface={surface} />
}
