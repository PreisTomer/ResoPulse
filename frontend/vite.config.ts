import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
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
