// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

/**
 * DOM highlight utilities for the Protocol lab-link feature.
 * Pure functions — no Vue or store imports.
 */

/**
 * Scroll an element into view and play the lab-highlight CSS animation.
 * The scroll fires immediately; the glow is delayed 400 ms so it begins after
 * the smooth-scroll animation has substantially completed.
 *
 * @param targetId  DOM id of the element to highlight
 * @param delayMs   Optional delay before the whole operation fires (useful after route mounts)
 */
export function scrollAndHighlight(targetId: string, delayMs = 0): void {
  const run = () => {
    const el = document.getElementById(targetId)
    if (!el) return

    const targets = resolveHighlightTargets(el)
    const primary = targets[0]!
    const inView = isInViewport(primary)
    if (!inView) primary.scrollIntoView({ behavior: 'smooth', block: 'center' })

    // Delay the glow until the smooth-scroll animation has mostly settled.
    // Skip the delay when no scroll was needed — element is already visible.
    setTimeout(() => targets.forEach(applyHighlight), inView ? 0 : 400)
  }

  if (delayMs > 0) {
    setTimeout(run, delayMs)
  } else {
    run()
  }
}

/** Returns true if the element is fully within the visible viewport. */
function isInViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect()
  return rect.top >= 0 && rect.bottom <= window.innerHeight
}

/**
 * Add the lab-highlight class and clean up after the animation ends.
 * Uses double-rAF to ensure the browser registers the class addition as a fresh animation,
 * even if the class was recently removed from the same element.
 */
function applyHighlight(target: HTMLElement): void {
  target.classList.remove('lab-highlight')
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('lab-highlight')
      target.addEventListener('animationend', () => {
        target.classList.remove('lab-highlight')
      }, { once: true })
    })
  })
}

/**
 * Resolves which DOM element(s) to actually highlight.
 * Returns an array — most cases return one element, but some (e.g. hl-cell-cards)
 * return multiple so all relevant toggles glow simultaneously.
 *
 * Rules (checked in order):
 * 1. Direct-child AccordionPanel wrapper (.accordion-panel):
 *    - Always highlight the outer container (avoids overflow:hidden clipping, e.g. hl-heatmap).
 * 2. Direct-child field-panel inline accordion button (.field-panel__accordion):
 *    - Always highlight the header button strip, open or closed.
 * 3. Target is inside a closed inline accordion body (v-show sets display:none on
 *    an ancestor .field-panel__accordion-body) → find the nearest header button.
 * 4. Target contains .cell-card__params-toggle buttons (e.g. hl-cell-cards):
 *    - Highlight ALL params toggle buttons so both cell cards glow.
 * 5. Otherwise → highlight the element itself.
 *
 * :scope > (direct-child selector) prevents false matches when the target merely
 * contains accordion sub-components several levels deep.
 */
function resolveHighlightTargets(el: HTMLElement): HTMLElement[] {
  // Case 1: direct-child AccordionPanel wrapper.
  // Always glow the outer container — avoids box-shadow clipping by overflow:hidden.
  const directAccordion = el.querySelector<HTMLElement>(':scope > .accordion-panel')
  if (directAccordion) return [el]

  // Case 2: FrequencySlider inline accordion section (hl-adv-section, hl-proto-section).
  // Always highlight the accordion header button (the labelled strip), open or closed.
  const fieldAccordionBtn = el.querySelector<HTMLElement>(':scope > .field-panel__accordion')
  if (fieldAccordionBtn) return [fieldAccordionBtn]

  // Case 3: Target is inside a closed inline accordion body (e.g. hl-snap-bar when Protocol is closed).
  // Walk up ancestors; if any .field-panel__accordion-body has display:none, return its sibling button.
  let ancestor: HTMLElement | null = el.parentElement
  while (ancestor) {
    if (ancestor.classList.contains('field-panel__accordion-body') && ancestor.style.display === 'none') {
      const btn = ancestor.parentElement?.querySelector<HTMLElement>(':scope > .field-panel__accordion')
      if (btn) return [btn]
    }
    ancestor = ancestor.parentElement
  }

  // Case 4: Container holding CellCard components (e.g. hl-cell-cards).
  // Highlight ALL .cell-card__params-toggle buttons so both cards glow simultaneously.
  const paramsToggles = Array.from(el.querySelectorAll<HTMLElement>('.cell-card__params-toggle'))
  if (paramsToggles.length > 0) return paramsToggles

  return [el]
}
