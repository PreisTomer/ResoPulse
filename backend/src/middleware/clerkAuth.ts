// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Clerk authentication middleware for Express.
// Attaches `req.auth` (userId, orgId, orgRole) to every request via Clerk's JWT verification.

import { clerkMiddleware, getAuth } from '@clerk/express'
import type { Request, Response, NextFunction } from 'express'

/**
 * Global Clerk middleware — must be applied before any route handlers.
 * Verifies the session JWT from the Authorization header and populates req.auth.
 * Both CLERK_SECRET_KEY and CLERK_PUBLISHABLE_KEY must be set in the environment.
 */
export const clerk = clerkMiddleware({
  secretKey:      process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
})

/**
 * Route guard: rejects requests with no valid session.
 * Use on any route that requires the user to be authenticated.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid session token is required.' })
    return
  }
  next()
}

/**
 * Route guard: rejects requests where the user has no active organisation.
 * Use on routes that are organisation-scoped (most data endpoints).
 */
export function requireOrg(req: Request, res: Response, next: NextFunction): void {
  const { userId, orgId } = getAuth(req)
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid session token is required.' })
    return
  }
  if (!orgId) {
    res.status(403).json({ error: 'Forbidden', message: 'An active organisation context is required.' })
    return
  }
  next()
}

/**
 * Convenience helper — extracts the validated auth context from any request.
 * Call after requireAuth or requireOrg to access userId, orgId, and orgRole safely.
 */
export function getRequestAuth(req: Request): { userId: string; orgId: string | null; orgRole: string | null } {
  const auth = getAuth(req)
  return {
    userId:  auth.userId  ?? '',
    orgId:   auth.orgId   ?? null,
    orgRole: auth.orgRole ?? null,
  }
}
