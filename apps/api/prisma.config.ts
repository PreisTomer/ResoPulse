// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Prisma 7 configuration — connection URL is declared here instead of schema.prisma.
// Supports any standard PostgreSQL provider (Supabase, Neon, Railway, etc.).
// See: https://pris.ly/d/config-datasource

import path from 'node:path'
import { defineConfig } from 'prisma/config'
import { config } from 'dotenv'

// Load .env so DATABASE_URL is available to the Prisma CLI at migrate time.
config({ path: path.join(__dirname, '.env') })

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    // sslmode=require ensures migrations also connect over TLS (Render Postgres requirement).
    url: process.env.DATABASE_URL ? `${process.env.DATABASE_URL}?sslmode=require` : '',
  },
})
