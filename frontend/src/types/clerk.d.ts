// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Ambient type declaration for the Clerk global set by @clerk/vue's clerkPlugin.
// Only the properties we access in router guards are declared here.

interface ClerkUserStub {
  organizationMemberships?: unknown[]
}

interface ClerkGlobal {
  user?: ClerkUserStub | null
  load(): Promise<void>
  createOrganization(params: { name: string; slug?: string }): Promise<unknown>
}

declare interface Window {
  Clerk?: ClerkGlobal
}
