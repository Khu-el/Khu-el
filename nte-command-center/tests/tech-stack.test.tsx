/**
 * Module 05 acceptance. Three boxes, three checks, no inspection.
 */
import React from 'react'
import { describe, expect, it, beforeEach } from 'vitest'
import techStack from '../src/modules/tech-stack'
import { ModuleBody } from '../src/App'
import { freezeStatus } from '../src/core/build-freeze'
import { setSurface } from '../src/core/storage'
import scan from '../seed/network-scan.json'
import seed from '../seed/tech-stack.json'
import { render, click, focusables, weekWith, typeInto } from './helpers'

beforeEach(() => {
  window.localStorage.clear()
  setSurface('lane-a')
})

const open = freezeStatus(weekWith(40))
const frozen = freezeStatus(weekWith(0))

describe('the security hold', () => {
  it('is the first focusable element in the module', () => {
    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={open} />,
    )
    const first = focusables(view.container)[0]
    expect(first).toBeTruthy()
    expect(first!.closest('.panel')!.textContent).toContain('Security hold')
    view.unmount()
  })

  it('has no collapse or dismiss control', () => {
    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={open} />,
    )
    const panel = view.container.querySelector('.panel')!
    const labels = Array.from(panel.querySelectorAll('button')).map((b) =>
      (b.textContent ?? '').toLowerCase(),
    )
    for (const word of ['dismiss', 'collapse', 'hide', 'close', 'acknowledge']) {
      expect(labels.some((l) => l.includes(word))).toBe(false)
    }
    expect(panel.querySelector('details, summary')).toBe(null)
    view.unmount()
  })

  it('survives the build freeze that closes the rest of the module', () => {
    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={frozen} />,
    )
    expect(view.text).toContain('Build freeze')
    expect(view.text).toContain('Security hold')
    expect(view.text).toContain('Plaintext credential file')
    // Everything that is build work is gone.
    expect(view.text).not.toContain('Application register')
    expect(view.text).not.toContain('Repository health')
    view.unmount()
  })
})

describe('the unified OS gate', () => {
  it('leaves the deploy step unreachable until export and hash carry proof', () => {
    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={open} />,
    )
    const rows = Array.from(view.container.querySelectorAll('.record')).filter(
      (r) => (r.textContent ?? '').includes('UOS-'),
    )
    const deploy = rows.find((r) => (r.textContent ?? '').includes('UOS-2'))!
    expect(deploy.textContent).toContain('UNREACHABLE')

    const button = deploy.querySelector('button')!
    // Disabled at the control, not hidden by styling.
    expect(button.hasAttribute('disabled')).toBe(true)
    click(button)
    expect(deploy.querySelector('input')).toBe(null)
    view.unmount()
  })

  it('opens the deploy step once the export step is proven', () => {
    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={open} />,
    )
    const rowFor = (id: string) =>
      Array.from(view.container.querySelectorAll('.record')).find((r) =>
        (r.textContent ?? '').includes(id),
      )!

    click(rowFor('UOS-1').querySelector('button')!)
    const inputs = rowFor('UOS-1').querySelectorAll('input')
    expect(inputs.length).toBe(3)
    const submit = Array.from(rowFor('UOS-1').querySelectorAll('button')).find(
      (b) => (b.textContent ?? '').startsWith('Record proof for'),
    )!
    // Nothing typed yet: the proof control refuses.
    expect(submit.hasAttribute('disabled')).toBe(true)

    typeInto(inputs[0] as HTMLInputElement, 'Private repository export')
    typeInto(inputs[1] as HTMLInputElement, 'sha256:0000000000000000')
    typeInto(inputs[2] as HTMLInputElement, 'Operator')
    click(
      Array.from(rowFor('UOS-1').querySelectorAll('button')).find((b) =>
        (b.textContent ?? '').startsWith('Record proof for'),
      )!,
    )

    expect(rowFor('UOS-1').textContent).toContain('PROVEN')
    const deploy = rowFor('UOS-2')
    expect(deploy.textContent).not.toContain('UNREACHABLE')
    expect(deploy.querySelector('button')!.hasAttribute('disabled')).toBe(false)
    view.unmount()
  })
})

describe('the external-request count', () => {
  it('is measured, not typed into the seed', () => {
    const text = JSON.stringify(seed)
    // No application row carries a numeric count. The only row that reports
    // one defers to the scan.
    for (const app of seed.applications) {
      expect(typeof app.externalRequests === 'number').toBe(false)
    }
    expect(text).toContain('"MEASURED"')
    expect(scan.externalRequests).toBe(0)

    const view = render(
      <ModuleBody module={techStack} surface="lane-a" status={open} />,
    )
    expect(view.text).toContain(
      `${scan.externalRequests} external requests · measured across ${scan.filesScanned} files`,
    )
    view.unmount()
  })
})
