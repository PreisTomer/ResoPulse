# Vue File Structure

Block order in every `.vue` file:

```
<template>                      ← first
<script lang="ts">              ← second
<style lang="scss" scoped>      ← last (where applicable)
```

- Always `<style lang="scss" scoped>` — no exceptions
- Every component (including sub-components like `CellHeader.vue`) owns its own scoped style block; parent styles never reach into child internals
- `:deep()` is for unavoidable third-party overrides only (Vuetify, PrimeVue, external widgets). Never use it to style your own sub-components
- All components use **Options API** (`export default defineComponent({})`) — never `<script setup>`. A `setup()` *inside* `defineComponent({...})` is allowed when a library requires it (Clerk's `useAuth()`/`useUser()`, `useRoute()`/`useRouter()`). Keep `setup()` minimal: call the composable, return refs, leave the rest in `data`/`computed`/`methods`. Do not migrate existing components

## Template conditionals — no inline multi-condition logic

Any `v-if` / `v-show` with more than one condition must be extracted to a `computed`.

```html
<!-- ✗ wrong -->
<div v-if="cellStore.doubleShellEnabled && hasNuclearParams">
<div v-if="!snapConfirming && !snapConfirmed">

<!-- ✓ correct -->
<div v-if="isNuclearMetaVisible">
<div v-if="isSnapIdle">
```

- Name the computed for **what is true**, not the conditions (`isSnapIdle`, not `isNotConfirmingAndNotConfirmed`)
- When TS cannot narrow through a boolean computed (e.g. ruling out `null` for a prop), add a narrowed accessor computed alongside — see `aiResult()` / `depData()` patterns
