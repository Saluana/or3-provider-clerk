# or3-provider-clerk

Clerk authentication provider for OR3 Chat. Provides SSR-safe auth middleware, token brokering, and session management via Clerk.

## Installation

```bash
bun add or3-provider-clerk
```

Or for local development (sibling repo):

```bash
# From the or3-chat root:
bun add or3-provider-clerk@link:../or3-provider-clerk
```

## Setup

### 1. Add to `or3.providers.generated.ts`

```typescript
export const or3ProviderModules = [
    'or3-provider-clerk/nuxt',
    // ... other providers
] as const;
```

### 2. Required environment variables

| Variable | Description |
|---|---|
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client-side) |
| `NUXT_CLERK_SECRET_KEY` | Clerk secret key (server-side only) |
| `SSR_AUTH_ENABLED` | Set to `true` to enable SSR auth |
| `AUTH_PROVIDER` | Set to `clerk` (default) |

### 3. Host integration

The provider registers itself via the OR3 hook/registry system at startup:

- **Auth provider**: `clerkAuthProvider` — resolves sessions from Clerk middleware
- **Token broker**: `ClerkTokenBroker` — mints provider-specific JWTs (e.g. for Convex)
- **Admin auth adapter**: validates Clerk-issued tokens for admin endpoints
- **Middleware**: `00.clerk` — runs Clerk's `clerkMiddleware()` on every request

## Runtime entrypoints

| File | Purpose |
|---|---|
| `src/module.ts` | Nuxt module entry — installs Clerk, registers plugins/middleware |
| `src/runtime/server/middleware/00.clerk.ts` | Clerk middleware (session resolution) |
| `src/runtime/server/plugins/register.ts` | Registers auth provider + token broker + admin adapter into core registries |
| `src/runtime/server/auth/clerk-auth-provider.ts` | Auth provider implementation |
| `src/runtime/server/auth/index.ts` | Auth provider barrel export |
| `src/runtime/server/token-broker/clerk-token-broker.ts` | Token broker for direct-mode providers |
| `src/runtime/server/admin/adapters/auth-clerk.ts` | Admin auth adapter |
| `src/runtime/plugins/auth-token-broker.client.ts` | Client plugin — bridges token broker to client-side sync providers |
| `src/runtime/plugins/session-logout-bridge.client.ts` | Client plugin — handles logout/session-change events |
