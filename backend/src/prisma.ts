// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Prisma 7 client singleton using the @prisma/adapter-pg driver adapter.
// Instantiation is lazy — the pool is only created on first access so a missing
// DATABASE_URL does not crash the server on startup.

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

let _prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma

  if (!process.env.DATABASE_URL) {
    throw new Error('[Prisma] DATABASE_URL is not set. Add it to your environment variables.')
  }

  const pool    = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' } })
  const adapter = new PrismaPg(pool)
  _prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  return _prisma
}

// Convenience re-export — use `prisma.user.findMany()` as before.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
