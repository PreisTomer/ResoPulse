import type { Directive } from 'vue'

// ── Singleton DOM node ──────────────────────────────────────────────────────
let tipEl: HTMLDivElement | null = null
let showTimer: ReturnType<typeof setTimeout> | null = null
let hideTimer: ReturnType<typeof setTimeout> | null = null

function ensureTip(): HTMLDivElement {
  if (!tipEl) {
    // Inject styles once
    const style = document.createElement('style')
    style.textContent = `
#br-tip {
  position: fixed;
  z-index: 99999;
  max-width: 260px;
  padding: 0.45rem 0.7rem;
  background: #0b1220;
  border: 1px solid rgba(0, 212, 255, 0.22);
  border-radius: 5px;
  font-family: 'JetBrains Mono', 'Fira Mono', ui-monospace, monospace;
  font-size: 0.6rem;
  line-height: 1.6;
  color: #8fa3c1;
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.12s, transform 0.12s;
  white-space: pre-line;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.55);
}
#br-tip.br-tip--on {
  opacity: 1;
  transform: translateY(0);
}
#br-tip strong {
  color: #e2ecf6;
  font-weight: 600;
}
#br-tip .tip-val {
  color: #00d4ff;
  font-weight: 600;
}
#br-tip .tip-warn {
  color: #ff4d6d;
}
#br-tip .tip-ok {
  color: #39ff14;
}
`
    document.head.appendChild(style)

    tipEl = document.createElement('div')
    tipEl.id = 'br-tip'
    document.body.appendChild(tipEl)
  }
  return tipEl
}

function show(content: string, e: MouseEvent) {
  if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
  const el = ensureTip()
  el.innerHTML = content
  el.classList.add('br-tip--on')
  positionTip(el, e)
}

function hide() {
  ensureTip().classList.remove('br-tip--on')
}

function positionTip(el: HTMLDivElement, e: MouseEvent) {
  const pad = 14
  const vw  = window.innerWidth
  const w   = el.offsetWidth  || 240
  const h   = el.offsetHeight || 70

  let x = e.clientX + pad
  let y = e.clientY - h - pad

  // flip right → left if near right edge
  if (x + w > vw - 8) x = e.clientX - w - pad
  // flip up → down if near top
  if (y < 8)          y = e.clientY + pad

  el.style.left = `${x}px`
  el.style.top  = `${y}px`
}

// ── Directive ───────────────────────────────────────────────────────────────
interface TipHandlers {
  enter: (e: Event) => void
  move:  (e: Event) => void
  leave: () => void
}

export const vTip: Directive<HTMLElement & { _tip?: TipHandlers }, string> = {
  mounted(el, binding) {
    const handlers: TipHandlers = {
      enter(e) {
        if (!binding.value) return
        if (showTimer) clearTimeout(showTimer)
        showTimer = setTimeout(() => show(binding.value, e as MouseEvent), 200)
      },
      move(e) {
        if (binding.value && ensureTip().classList.contains('br-tip--on')) {
          positionTip(ensureTip(), e as MouseEvent)
        }
      },
      leave() {
        if (showTimer) { clearTimeout(showTimer); showTimer = null }
        hideTimer = setTimeout(hide, 80)
      },
    }
    el._tip = handlers
    el.addEventListener('mouseenter', handlers.enter)
    el.addEventListener('mousemove',  handlers.move)
    el.addEventListener('mouseleave', handlers.leave)
    el.style.cursor = el.style.cursor || 'default'
  },

  beforeUnmount(el) {
    if (el._tip) {
      el.removeEventListener('mouseenter', el._tip.enter)
      el.removeEventListener('mousemove',  el._tip.move)
      el.removeEventListener('mouseleave', el._tip.leave)
    }
  },
}
