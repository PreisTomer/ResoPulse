// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Ambient type declaration for the Clerk global set by @clerk/vue's clerkPlugin.
// Only the properties we access in router guards are declared here.

interface ClerkUserStub {
  organizationMemberships?: unknown[]
}

interface ClerkSession {
  getToken(): Promise<string | null>
}

interface ClerkGlobal {
  user?:    ClerkUserStub | null
  session?: ClerkSession  | null
  load(): Promise<void>
  createOrganization(params: { name: string; slug?: string }): Promise<unknown>
}

declare interface Window {
  Clerk?: ClerkGlobal
}
