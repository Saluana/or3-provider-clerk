# or3-provider-clerk

Clerk authentication provider for [OR3 Chat](https://github.com/or3-chat/or3-chat) — SSR-safe auth middleware, token brokering, and session management via Clerk.

## What It Provides

- **SSR auth middleware** (`00.clerk`) — runs Clerk's `clerkMiddleware()` so `event.context.auth` is available to downstream SSR endpoints
- Clerk session tokens are restricted to the exact origins in `OR3_ALLOWED_ORIGINS` and `OR3_PUBLIC_DOMAIN`; configure at least one for production. Verified primary-email profile enrichment is cached for at most 30 seconds while every request still authenticates its token.
- **`AuthProvider`** (`clerk`) — resolves OR3 sessions from the Clerk SSR context and validates the session JWT
- **Server `ProviderTokenBroker`** (`clerk`) — mints Clerk JWT template tokens (e.g. the Convex template) for SSR endpoints
- **Client auth token broker** — exposes Clerk session tokens through `useAuthTokenBroker()` for direct-mode sync providers
- **Admin auth adapter** — reports Clerk key configuration status/warnings in the admin dashboard
- **Auth UI + lock page adapters** — registers `SidebarAuthButtonClerk` and `ClerkLockPage` with the core auth UI registry
- **Session/logout bridge** — client plugin that refreshes the OR3 session on Clerk changes and tears down local state on sustained sign-out

This is an auth-only provider. Pair it with a sync provider (e.g. `or3-provider-convex`) and a storage provider (e.g. `or3-provider-fs`) for a complete stack.

## Install

```bash
bun add or3-provider-clerk
```

For local development (sibling repo):

```bash
# From the or3-chat root:
bun add or3-provider-clerk@link:../or3-provider-clerk
```

Add the module to your generated provider list:

```ts
export const or3ProviderModules = [
  'or3-provider-clerk/nuxt',
  // ... other providers
] as const;
```

## Environment

| Variable | Required | Default | Description |
|---|---|---|---|
| `SSR_AUTH_ENABLED` | **Yes** | `false` | Must be `true` for the provider to activate (maps to `runtimeConfig.auth.enabled`) |
| `AUTH_PROVIDER` | Yes | `clerk` | Must be `clerk` (alias `OR3_AUTH_PROVIDER` is also accepted by the host) |
| `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | **Yes** | — | Clerk publishable key, client-side (maps to `runtimeConfig.public.clerkPublishableKey`) |
| `NUXT_CLERK_SECRET_KEY` | **Yes** | — | Clerk secret key, server-side only (maps to `runtimeConfig.clerkSecretKey`) |

Get keys from the Clerk dashboard (API Keys page).

## Startup validation

When SSR auth is enabled and `AUTH_PROVIDER=clerk`, the register plugin validates Clerk keys at startup:

- **Missing keys fail startup** — a missing publishable or secret key throws and prevents the server from starting.
- **Test keys are rejected in production** — in `NODE_ENV=production`, keys starting with `pk_test_` or `sk_test_` are refused. Use live (`pk_live_`/`sk_live_`) keys for production instances.

The provider is otherwise inert: middleware, server plugin, and client plugins all no-op when SSR auth is disabled or the active provider is not `clerk`, so static builds are unaffected.

## Host integration

The provider registers itself via the OR3 hook/registry system at startup:

- **Auth provider**: `clerkAuthProvider` — resolves sessions from the Clerk middleware context, validates the JWT `exp` claim, and fetches the full user profile via the Clerk Backend SDK
- **Token broker**: `ClerkTokenBroker` — mints Clerk JWT template tokens (`getToken({ template })`) for direct-mode providers and SSR token requests
- **Admin auth adapter**: reports publishable/secret key configuration status in the admin dashboard
- **Middleware**: `00.clerk` — runs Clerk's `clerkMiddleware()` on every request when SSR auth is enabled and the provider is `clerk` (name-prefixed `00.` so it runs before other middleware)
- **Client plugins**: auth token broker, session/logout bridge, and auth UI adapter registration

The registered sidebar auth adapter accepts `layout="rail"` (default) and
`layout="more-sheet"`. The More-sheet layout renders a full-width Account or
Login row using the host's shared `.more-row` anatomy; signed-in Account opens
the Clerk user profile directly.

Session provisioning requires a primary email whose Clerk verification status is `verified`; absent or unverified primary addresses cause the session to be rejected.

## Token brokering

Clerk issues provider-specific JWTs via **JWT templates** configured in the Clerk dashboard. The token broker passes the request's `template` through to `session.getToken({ template })`, so each direct-mode sync provider (e.g. Convex direct mode) gets a token for its own template without core code depending on the Clerk SDK. If no template is requested, Clerk's default session token is used. Empty or failed token minting is logged and returns `null` rather than throwing.

## Runtime entrypoints

| File | Purpose |
|---|---|
| `src/module.ts` | Nuxt module entry — installs `@clerk/nuxt`, registers middleware/plugins |
| `src/runtime/server/middleware/00.clerk.ts` | Clerk middleware (session resolution, gated on SSR auth + provider) |
| `src/runtime/server/plugins/register.ts` | Registers auth provider + token broker + admin adapter; startup key validation |
| `src/runtime/server/auth/clerk-auth-provider.ts` | Auth provider implementation |
| `src/runtime/server/auth/index.ts` | Auth provider barrel export |
| `src/runtime/server/token-broker/clerk-token-broker.ts` | Server token broker for Clerk JWT template tokens |
| `src/runtime/server/admin/adapters/auth-clerk.ts` | Admin auth adapter |
| `src/runtime/plugins/auth-token-broker.client.ts` | Client plugin — bridges token broker to client-side sync providers |
| `src/runtime/plugins/session-logout-bridge.client.ts` | Client plugin — handles logout/session-change events |
| `src/runtime/plugins/clerk-auth-ui.client.ts` | Client plugin — registers auth UI + lock page adapters |
| `src/runtime/components/SidebarAuthButtonClerk.client.vue` | Sidebar auth button component |
| `src/runtime/components/ClerkLockPage.client.vue` | Lock page component |
| `src/runtime/lib/wait-for-clerk.client.ts` | Waits for the client Clerk SDK to load |
| `src/runtime/lib/clerk-token-flight.client.ts` | Single-flight dedupe for `session.getToken` calls |

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Missing Clerk publishable key (runtimeConfig.public.clerkPublishableKey)` | `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY` not set | Set the publishable key and restart |
| `Missing Clerk secret key (runtimeConfig.clerkSecretKey)` | `NUXT_CLERK_SECRET_KEY` not set | Set the secret key (server-only) and restart |
| `Refusing to start with Clerk test publishable key in production` | `pk_test_...` used in `NODE_ENV=production` | Use `pk_live_...` keys in production |
| `Refusing to start with Clerk test secret key in production` | `sk_test_...` used in `NODE_ENV=production` | Use `sk_live_...` keys in production |
| `Configured provider "clerk" expects package "or3-provider-clerk", but it is not installed.` | `AUTH_PROVIDER=clerk` set but package missing | Install `or3-provider-clerk` or change `AUTH_PROVIDER` |
| Session rejected despite a valid Clerk login | User's primary email is missing or its Clerk verification status is not `verified` | Verify the primary email in the Clerk dashboard / via the user profile |
| `[token-broker:clerk] Empty token returned` | JWT template name is wrong or has no claims | Check the template name in the Clerk dashboard matches the provider's request |
| Client shows signed out state after every reload | Stale `or3:server-route-available` / session caches | Clear localStorage caches and reload |

## Development

```bash
bun run test                # Run tests
bun run type-check          # TypeScript check
bun run type-check:standalone  # Standalone tsconfig typecheck
bun run build               # Build nuxt module
```


### Testing local changes in OR3 Chat

With this repository beside `or3-chat`, run `bun install` here once, then
`bun run dev:ssr` from Chat. Chat's dev wrapper rebuilds the local provider and
prints its selected path; restart it after provider edits. Missing repositories
or failed builds fall back to installed packages with a warning.
`OR3_LOCAL_PROVIDERS=false` disables local selection. Production builds use the
installed package, so local development does not publish these changes.
