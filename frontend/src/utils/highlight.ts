// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// DOM highlight utilities for the Protocol lab-link feature. Pure — no Vue/store imports.

// Scroll element into view and play the lab-highlight animation.
// Glow delayed 400 ms after scroll settles; skipped when already in viewport.
export function scrollAndHighlight(targetId: string, delayMs = 0): void {
  const run = () => {
    const el = document.getElementById(targetId)
    if (!el) return
    const targets = resolveHighlightTargets(el)
    const primary = targets[0]!
    const inView = isInViewport(primary)
    if (!inView) primary.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => targets.forEach(applyHighlight), inView ? 0 : 400)
  }
  if (delayMs > 0) setTimeout(run, delayMs)
  else run()
}

function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 && rect.bottom <= window.innerHeight
}

// Double-rAF ensures the browser registers the class as a fresh animation even after recent removal.
function applyHighlight(target: HTMLElement): void {
  target.classList.remove('lab-highlight')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('lab-highlight')
      target.addEventListener('animationend', () => target.classList.remove('lab-highlight'), { once: true })
    })
  })
}

// Resolve which DOM element(s) to highlight:
// 1. Direct-child .accordion-panel → outer container (avoids overflow:hidden clipping)
// 2. Direct-child .field-panel__accordion → header button strip
// 3. Inside a closed .field-panel__accordion-body → nearest header button
// 4. Contains .cell-card__params-toggle → all toggles simultaneously
// 5. Otherwise → element itself
function resolveHighlightTargets(el: HTMLElement): HTMLElement[] {
  if (el.querySelector<HTMLElement>(':scope > .accordion-panel')) return [el]

  const fieldAccordionBtn = el.querySelector<HTMLElement>(':scope > .field-panel__accordion')
  if (fieldAccordionBtn) return [fieldAccordionBtn]

  let ancestor: HTMLElement | null = el.parentElement
  while (ancestor) {
    if (ancestor.classList.contains('field-panel__accordion-body') && ancestor.style.display === 'none') {
      const btn = ancestor.parentElement?.querySelector<HTMLElement>(':scope > .field-panel__accordion')
      if (btn) return [btn]
    }
    ancestor = ancestor.parentElement
  }

  const paramsToggles = Array.from(el.querySelectorAll<HTMLElement>('.cell-card__params-toggle'))
  if (paramsToggles.length > 0) return paramsToggles

  return [el]
}
