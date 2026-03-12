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
    // Terser provides more aggressive name mangling than the esbuild default,
    // making property names and logic harder to reverse-engineer.
    minify: 'terser',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    terserOptions: {
      mangle: { toplevel: true },
      format: { comments: false },
    } as any,
  },
})
