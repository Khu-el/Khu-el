import React, { act } from 'react'
import { createRoot } from 'react-dom/client'

/**
 * Render into a detached container and hand back its markup and its node.
 *
 * Deliberately not a testing-library wrapper: these tests assert on the DOM a
 * surface actually produces, including the absence of controls, and the fewer
 * layers between the assertion and the document the harder the assertion is to
 * fool.
 */
export function render(element: React.ReactElement): {
  container: HTMLElement
  text: string
  html: string
  unmount: () => void
} {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return {
    container,
    get text() {
      return container.textContent ?? ''
    },
    get html() {
      return container.innerHTML
    },
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

/** Click a node inside a rendered tree and flush the resulting update. */
export function click(node: Element): void {
  act(() => {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** Set a controlled input's value the way a person typing would. */
export function typeInto(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  act(() => {
    setter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Every button, link and field a person could reach in a rendered tree. */
export function focusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  )
}

/** A freeze state carrying `count` contacts in the current week. */
export function weekWith(count: number): { weeks: { weekOf: string; count: number }[] } {
  const now = new Date()
  const copy = new Date(now)
  const day = copy.getDay()
  copy.setDate(copy.getDate() + (day === 0 ? -6 : 1 - day))
  return { weeks: [{ weekOf: copy.toISOString().slice(0, 10), count }] }
}
