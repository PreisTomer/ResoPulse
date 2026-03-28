import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Allow @use 'globals' (short name) from any component style block.
        loadPaths: [path.resolve(__dirname, 'src/styles')],
        // Auto-inject globals into every Vue SFC <style lang="scss"> block.
        // Skip SCSS partials (filenames starting with _) to avoid circular @forward.
        additionalData: (source: string, filename: string) => {
          const base = (filename.split('/').pop() ?? filename.split('\\').pop() ?? '')
          if (base.startsWith('_')) return source
          return `@use 'globals' as *;\n${source}`
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    // Disable source maps in production — prevents browser DevTools from
    // exposing readable source code to end users.
    sourcemap: false,
    // esbuild (Vite default) is safe for multi-chunk builds; Terser toplevel
    // mangling caused fatal name collisions between Vue/Pinia internals and
    // physics constants across Rollup code-split chunks.
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // Split vendor bundle so each chunk stays well under 500 kB.
        // Separate chunks also improve browser caching — vendor libs change
        // far less often than app code, so users only re-download what changed.
        manualChunks: {
          // Vue ecosystem — almost never changes between deploys
          'vue-vendor':    ['vue', 'vue-router', 'pinia', 'pinia-plugin-persistedstate', 'vue-i18n'],
          // Network layer — socket.io-client is ~50 kB and version-locked independently
          'socket-vendor': ['socket.io-client'],
          // Utility libs — lodash is large; versioned separately from Vue
          'utils-vendor':  ['lodash'],
          // D3 stays in the lazy ExperimentView chunk — no need to load it on other routes
        },
      },
    },
  },
})
