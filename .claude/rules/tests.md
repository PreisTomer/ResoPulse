# Build and Test Verification

After every change, from the repo root:

```bash
npm run build:frontend
npm -w @simbiotix/web run test
```

Zero TS errors **and** zero failing tests. Vercel runs `npm run test` in deploy — a green build alone is not sufficient.

## When to write tests (not optional)

| Change | Required test |
|---|---|
| New pure utility in `utils/<domain>/` | Sibling `<domain>.test.ts` — happy path + edge cases (empty, malformed, boundaries) |
| New store action/getter with non-trivial logic (clamping, rounding, branching, persistence) | Unit test in `stores/<store>/<store>.test.ts` |
| Bug fix to any pure function or store action | Regression test that **fails before, passes after** |
| New branch in a physics computation (waveform, cell category, chart mode) | Test for the new branch in `utils/physics/physics*.test.ts` or the relevant store test |
| CSV/import/export schema change (new/renamed column, new alias) | Round-trip or parser test exercising the new header |
| New `consumeOperation('FOO')` gate | Test it returns early on 402 and on guest sessions |

## Test quality

- **Black-box** — assert on the public API, not internal helper state
- **One behaviour per test** — one invariant per `it(...)`
- **Name the invariant, not the input** — `it('clamps viability to 0-100 range')`, not `it('works with -5 and 120')`
- **Deterministic** — no wall-clock `Date.now()`, no `Math.random()`, no real network. Use fixtures, seeds, `vi.useFakeTimers()`, `vi.stubGlobal('fetch', ...)`
- **Fast** — pure-logic tests under 50ms each

## Forbidden shortcuts to green

- Never add `.skip`, `.only`, `.todo`, `xit(...)` to pass a run
- Never comment out a failing test or assertion
- Never weaken an assertion (`toBeGreaterThan(0)` where it was `toBe(42)`) to paper over regression
- Never mock the thing under test
- Never swallow `await` rejections with `try {} catch {}` to stop a test failing

## Before handing back

1. `npm run build:frontend` → green
2. `npm -w @simbiotix/web run test` → every test passes, no `.skip`/`.only`
3. After adding/renaming a locale key, physics constant, or exported symbol, re-run both — stale imports can pass one and fail the next
4. If either fails, fix it or flag the failure explicitly with output. Never hand back a red pipeline
