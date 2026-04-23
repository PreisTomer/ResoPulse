/**
 * Prisma migration wrapper for Render deploys.
 *
 * Problem: on crashed / timed-out deploys the Prisma advisory lock
 * (pg_advisory_lock(72707369)) can be left held by an abandoned session,
 * causing the next `prisma migrate deploy` to fail with P1002 after 10s.
 *
 * Fix: before running migrations, terminate any backend sessions that hold
 * the lock and whose connection is idle (i.e. the process that took the lock
 * is gone). Then run `prisma migrate deploy` normally.
 *
 * Safe on Render Free because only one service instance runs at a time, so
 * any pre-existing holder of this lock is by definition stale.
 */

import { spawnSync } from 'node:child_process'
import pg from 'pg'

const PRISMA_ADVISORY_LOCK_ID = 72707369
const STALE_IDLE_SECONDS = 5

async function clearStaleLock() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    const { rows } = await client.query(
      `SELECT a.pid, a.state, a.application_name,
              EXTRACT(EPOCH FROM (now() - a.state_change))::int AS idle_seconds
         FROM pg_locks l
         JOIN pg_stat_activity a ON a.pid = l.pid
        WHERE l.locktype = 'advisory'
          AND l.objid = $1
          AND a.pid <> pg_backend_pid()`,
      [PRISMA_ADVISORY_LOCK_ID]
    )

    if (rows.length === 0) {
      console.log('[migrate-deploy] no pre-existing advisory lock holders')
      return
    }

    for (const row of rows) {
      const isStale =
        row.state === 'idle' ||
        row.state === 'idle in transaction' ||
        row.state === 'idle in transaction (aborted)' ||
        (row.idle_seconds ?? 0) >= STALE_IDLE_SECONDS

      if (isStale) {
        console.log(
          `[migrate-deploy] terminating stale lock holder pid=${row.pid} ` +
            `state=${row.state} idle=${row.idle_seconds}s app=${row.application_name}`
        )
        await client.query('SELECT pg_terminate_backend($1)', [row.pid])
      } else {
        console.log(
          `[migrate-deploy] active lock holder pid=${row.pid} state=${row.state} ` +
            `idle=${row.idle_seconds}s — leaving alone`
        )
      }
    }
  } finally {
    await client.end()
  }
}

async function main() {
  try {
    await clearStaleLock()
  } catch (err) {
    console.warn(
      '[migrate-deploy] stale-lock cleanup failed, continuing to migrate:',
      err instanceof Error ? err.message : err
    )
  }

  const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: true,
  })
  process.exit(result.status ?? 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
