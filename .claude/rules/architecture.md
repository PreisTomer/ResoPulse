# Architecture — Stores, Tokens, Guest Session

## Store ↔ Component Consistency

When a store serialises data (e.g. CSV export in `experimentStore`), field names, order, and units **must exactly match** what the screen renders. Changing a display label means updating the export header.

## Token / Premium Operation Gating

Every token-consuming or paid-plan action goes through `tokenStore.consumeOperation(reason)` **before** any work — signed-in (budget check) and guest (always blocked).

```ts
async handleExport(): Promise<void> {
  const canProceed = await this.tokenStore.consumeOperation('EXPORT_REPORT')
  if (!canProceed) return
  // proceed
}
```

- Returns `false` + sets `pendingUpgrade` when a signed-in user lacks tokens (NavBar upgrade modal opens)
- Returns `false` + sets `pendingGuestSignUp` when a guest tries the action (NavGuestArea dropdown opens)
- Never write custom "insufficient tokens" handling — let the store drive
- `reason` is SCREAMING_SNAKE_CASE, sent to backend for audit (`'AI_OPTIMIZE'`, `'SAVE_EXPERIMENT'`, `'EXPERIMENT_REPORT'`)

Every new paid/cost feature: `consumeOperation` is the first line of the handler.

## Guest Session Architecture

Managed in `services/socket.ts`:

- `guestSessionActive` — exported `ref<boolean>`, initialised from `sessionStorage`, persists across refreshes within the tab. Components import and use directly in reactive contexts
- `getOrCreateGuestToken()` (internal) — creates `guest_{uuid}` in `sessionStorage`, sets `guestSessionActive.value = true`. Called by the socket auth callback when no Clerk session exists
- `hasGuestSession()` — exported helper used by `tokenStore` to decide whether to set `pendingGuestSignUp`

**NavBar display** (`showNavGuestArea` computed):
- Show `NavGuestArea` (guest avatar "G") when: not signed in AND `guestSessionActive` AND not on home page
- Show "Start Free" button otherwise (including home page, even if a guest session exists — keep conversion CTA visible)
- Never both simultaneously; use `v-else-if`

Guest token lives in `sessionStorage`, not `localStorage` — clears on tab close.
