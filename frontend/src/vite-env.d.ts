/// <reference types="vite/client" />

// Augment Vite's ImportMetaEnv — do NOT re-declare ImportMeta itself
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
}

// Satisfy noUncheckedSideEffectImports for CSS/image imports
declare module '*.css' {
  const styles: Record<string, string>
  export default styles
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.vue' {
  import type { Component } from 'vue'
  const component: Component
  export default component
}
