/// <reference types="vite/client" />

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.vue' {
  import type { Component } from 'vue'
  const component: Component
  export default component
}
