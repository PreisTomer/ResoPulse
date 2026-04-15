// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
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
