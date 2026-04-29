# Architecture — Stores, Guest Session

## Store ↔ Component Consistency

When a store serialises data (e.g. CSV export in `experimentStore`), field names, order, and units **must exactly match** what the screen renders. Changing a display label means updating the export header.

## Guest Session Architecture

Managed in `services/socket.ts`:

- `guestSessionActive` — exported `ref<boolean>`, initialised from `sessionStorage`, persists across refreshes within the tab. Components import and use directly in reactive contexts
- `getOrCreateGuestToken()` (internal) — creates `guest_{uuid}` in `sessionStorage`, sets `guestSessionActive.value = true`. Called by the socket auth callback when no Clerk session exists
- `hasGuestSession()` — exported helper for any code that needs to know whether a guest session is active

**NavBar display** (`showNavGuestArea` computed):
- Show `NavGuestArea` (guest avatar "G") when: not signed in AND `guestSessionActive` AND not on home page
- Show "Start Free" button otherwise (including home page, even if a guest session exists — keep conversion CTA visible)
- Never both simultaneously; use `v-else-if`

Guest token lives in `sessionStorage`, not `localStorage` — clears on tab close.
