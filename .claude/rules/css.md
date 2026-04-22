# CSS

## Write Once, Token Always

Before writing any CSS, run this checklist top to bottom:

1. **Is there a CSS custom property for this value?** → use `var(--token)`. Never inline a raw hex, rgba, rem, opacity, or transition when a token exists.
2. **Is there an SCSS mixin for this property group?** → use `@include mixin()`. Never copy a 3+ property cluster that a mixin covers. This includes:
   - `@include color-variant($name, $border-pct: 30%, $bg-pct: 7%)` → `color + border-color + background` all tinted from `--color-{name}`
   - `@include tinted-surface($name, $border-pct: 25%, $bg-pct: 5%)` → `border-color + background` only (no text colour)
3. **Is this a tint/opacity variant of a base color?** → `color-mix(in srgb, var(--color-X) Y%, transparent)`. Never raw `rgba()`.
4. **Is this a new pattern appearing in 2+ places?** → add a mixin to `src/styles/_mixins.scss` or a token to `src/style.css` before duplicating.

```scss
// ✗ wrong
.my-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.55;
  transition: color 0.15s;
}

// ✓ correct
.my-label {
  @include mono-upper(var(--fs-xxs));
  opacity: var(--op-muted);
  transition: color var(--tr-fast);
}
```

## BEM + Nested SCSS

Use BEM with SCSS nesting; never flat selectors.

```scss
// ✗ wrong
.card-header { }
.card-header-title { }
.card-header-title--active { }

// ✓ correct
.card {
  &__header { }
  &__title { &--active { } }
}
```

BEM nesting works inside scoped SCSS **for elements the component itself renders**. SCSS's `&` cannot append a suffix to `:deep(...)` — never nest `&--modifier` or `&__element` inside a `:deep()` block.

### One root BEM block per component

```scss
// ✗ wrong — flat siblings
.experiment__header { }
.experiment__header-left { }
.experiment__chip { }
.experiment__chip-dot { }

// ✓ correct
.experiment {
  &__header {
    &-left { }
    &-right { }
  }
  &__chip {
    &-dot { &--warn { } }
    &--connected { }
  }
}
```

When a component's root element has class `experiment__header`, the SCSS root is `.experiment` (block), not `.experiment__header` (element).

### Media queries nest inside the element

```scss
// ✓ correct
.experiment {
  &__header {
    padding: 1rem;
    @media (max-width: 768px) { padding: 0.5rem; }
  }
}
```

Vendor-prefixed properties always pair with the standard:
```scss
-moz-appearance: none;
appearance: none;
```

## Design Tokens — Mandatory

Full set in `src/style.css :root`. Never write a raw value when a token exists.

### Font sizes — `--fs-*`

| Token | Value | Use for |
|---|---|---|
| `--fs-xxs` | 0.65rem | Section titles, formula annotations, badge labels |
| `--fs-xs` | 0.70rem | Secondary mono data, stat sub-labels |
| `--fs-sm` | 0.75rem | Primary mono labels, key data |
| `--fs-md` | 0.82rem | Readable data, body labels |
| `--fs-lg` | 0.875rem | Standard body text |
| `--fs-xl` | 0.90rem | Significant labels, readout sub-text |

Off-scale values (e.g. `0.6rem` for a deliberate micro-size) are allowed — comment why.

### Opacity — `--op-*`

| Token | Value | Use for |
|---|---|---|
| `--op-ghost` | 0.35 | Near-invisible decorations, disabled |
| `--op-muted` | 0.55 | Secondary text, placeholders |
| `--op-dim` | 0.70 | Tertiary badges, background labels |
| `--op-partial` | 0.80 | Inactive elements, faded highlights |
| `--op-strong` | 0.90 | Near-opaque elements |

**Exception:** raw opacity is required inside `@keyframes` — CSS variables do not interpolate there.

### Transitions — `--tr-*`

| Token | Value | Use for |
|---|---|---|
| `--tr-fast` | 0.15s ease | Micro-interactions (thumb glow, icon swap) |
| `--tr-normal` | 0.20s ease | Hover states, badge shifts |
| `--tr-slow` | 0.30s ease | Panel open/close, accordion |

Multi-property transitions: replace each duration separately, do not collapse into a single var unless using `transition: all`. Off-scale durations (`0.1s`, `0.18s`, `0.7s`, `1s`, entrance animations) stay raw.

### Border radius — `--radius` / `--radius-lg`

```scss
border-radius: var(--radius);     // 8px
border-radius: var(--radius-lg);  // 12px
```

Fine-detail (`2–6px`, `10px`) and partial-corner (`8px 0 0 8px`) values stay raw.

### Colors — `--color-*`

Never write raw hex or `rgba()` in style blocks. For tints use `color-mix(in srgb, var(--color-X) Y%, transparent)`. Named semantic tint tokens (`--color-primary-surface`, `--color-danger-border`) are preferred when the percentage matches.

```scss
// ✗ wrong
color: #fbbf24;
background: rgba(0, 212, 255, 0.08);

// ✓ correct
color: var(--color-amber);
background: color-mix(in srgb, var(--color-primary) 8%, transparent);
```

**Hardcoded-context exceptions** — CSS variables do not evaluate here:

| Context | Rule |
|---|---|
| D3 `.attr('fill'/'stroke', ...)` | Use `C.*` from `src/theme/colors.ts` |
| Canvas `ctx.fillStyle`/`strokeStyle` | Use `C.*` from `src/theme/colors.ts` |
| Static SVG template attributes (`stroke="..."`) | Move to a scoped CSS class and use `color-mix()` |
| JS template strings injected as CSS (`vTooltip.ts`) | Use `color-mix(in srgb, white X%, transparent)` — CSS vars work once injected |

Only add new `C.*` constants when D3/canvas genuinely needs a pre-resolved string; not for anything expressible via `color-mix()`.

## SCSS Mixin Library

Check `src/styles/_mixins.scss` before writing any repeated pattern.

| Mixin | Signature | Generates |
|---|---|---|
| `flex-row` | `($gap: 0.5rem)` | flex + align-center + gap |
| `flex-col` | `($gap: 0.5rem)` | flex column + gap |
| `flex-between` | `($gap: 0)` | flex + space-between + optional gap |
| `inline-flex-center` | `()` | inline-flex centered both axes |
| `surface-card` | `($radius, $padding)` | bg + border + radius for panels |
| `mono-upper` | `($size, $spacing)` | font-mono + uppercase + letter-spacing |
| `badge-pill` | `($padding, $radius)` | mono-caps inline label with border |
| `table-header-cell` | `($overlay)` | mono-caps + muted + overlay bg for `<th>` |
| `status-strip` | `($color, $bg, $border, $anim, $dur)` | coloured alert strip inside cell cards |
| `section-title` | `()` | tiny mono-caps label |
| `accordion-header` | `()` | shared collapse-toggle button |
| `row-label` | `()` | mono uppercase label for slider rows |
| `slider-track` | `()` | range input appearance reset |
| `slider-thumb` | `($bg, $shadow)` | webkit + moz thumb |
| `readout-step-btn` | `()` | +/- increment buttons |
| `readout-inline-input` | `()` | click-to-edit number input overlay |
| `color-variant` | `($name, $border-pct: 30%, $bg-pct: 7%)` | color + border + bg tinted from `--color-{name}` |
| `tinted-surface` | `($name, $border-pct: 25%, $bg-pct: 5%)` | border + bg only (no text colour) |
| `info-panel` | `($bg, $border-color)` | tinted bordered section panel |
| `cell-state-classes` | `()` | generates `&__state--<name>` rules from the state map |
| `data-value-classes` | `($mono-size, $muted-opacity)` | mono/muted/cancer/warn value classes for data tables |

```scss
// ✗ wrong — 8 properties written by hand
font-family: var(--font-mono);
font-size: var(--fs-xxs);
text-transform: uppercase;
letter-spacing: 0.08em;
display: inline-flex;
padding: 0.15rem 0.5rem;
border-radius: 3px;
border: 1px solid;

// ✓ correct
@include badge-pill();
```

## Keyframes — centralised in `src/styles/_keyframes.scss`

Global keyframes are accessible from every scoped block without import. Never duplicate a keyframe in a component file; add new shared keyframes to `_keyframes.scss`.
