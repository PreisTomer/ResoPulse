// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include:     ['src/**/*.test.ts'],
    testTimeout: 10_000,
    env: {
      NODE_ENV: 'test',
    },
  },
})
