import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Disable source maps in production — prevents browser DevTools from
    // exposing readable source code to end users.
    sourcemap: false,
    // esbuild (Vite default) is safe for multi-chunk builds; Terser toplevel
    // mangling caused fatal name collisions between Vue/Pinia internals and
    // physics constants across Rollup code-split chunks.
    minify: 'esbuild',
  },
})
