// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

export interface Particle { x: number; y: number; vx: number; vy: number }

export interface ParticleConfig {
  count:           number
  speed:           number
  radius:          number
  opacity:         number
  connectionDist:  number
  connectionAlpha: number
  rgb:             string  // e.g. '0, 212, 255'
}

export function buildParticles(canvas: HTMLCanvasElement, count: number, speed: number): Particle[] {
  const w = canvas.offsetWidth
  const h = canvas.offsetHeight
  return Array.from({ length: count }, () => ({
    x:  Math.random() * w,
    y:  Math.random() * h,
    vx: (Math.random() - 0.5) * speed * 2,
    vy: (Math.random() - 0.5) * speed * 2,
  }))
}

export function stepParticles(particles: Particle[], w: number, h: number): void {
  for (const p of particles) {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0 || p.x > w) p.vx *= -1
    if (p.y < 0 || p.y > h) p.vy *= -1
  }
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[], config: ParticleConfig): void {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const a = particles[i]
      const b = particles[j]
      if (!a || !b) continue
      const dx   = a.x - b.x
      const dy   = a.y - b.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < config.connectionDist) {
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = `rgba(${config.rgb},${(1 - dist / config.connectionDist) * config.connectionAlpha})`
        ctx.lineWidth   = 0.6
        ctx.stroke()
      }
    }
  }
  for (const p of particles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, config.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${config.rgb},${config.opacity})`
    ctx.fill()
  }
}

export function traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

export function startCanvasLoop(
  canvas:    HTMLCanvasElement,
  onRebuild: () => void,
  onFrame:   (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  let frameId: ReturnType<typeof requestAnimationFrame> | null = null

  const tick = () => {
    const w = canvas.offsetWidth
    const h = canvas.offsetHeight
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width  = w
      canvas.height = h
      onRebuild()
    }
    ctx.clearRect(0, 0, w, h)
    onFrame(ctx, w, h)
    frameId = requestAnimationFrame(tick)
  }

  frameId = requestAnimationFrame(tick)
  return () => { if (frameId !== null) cancelAnimationFrame(frameId) }
}

export function patchClerkAutocomplete(cardEl: Element | null | undefined, value: string): void {
  if (!cardEl) return
  const observer = new MutationObserver(() => {
    const input = cardEl.querySelector('input[type="password"]') as HTMLInputElement | null
    if (input && !input.getAttribute('autocomplete')) {
      input.setAttribute('autocomplete', value)
      observer.disconnect()
    }
  })
  observer.observe(cardEl, { childList: true, subtree: true })
}
