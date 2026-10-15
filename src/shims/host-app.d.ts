/**
 * Type-only stubs for host-app modules imported via ~/ path aliases.
 *
 * These declarations prevent tsc from following into the host-app source tree
 * (which would drag in Nuxt auto-imports, Dexie, Orama, etc. that don't
 * resolve in a standalone provider typecheck).
 *
 * At runtime, Nuxt's module system resolves these paths to the real host-app
 * files. These stubs only need to provide enough type information for the
 * provider's own source to type-check correctly.
 */

declare module '~/utils/logout-cleanup' {
    export function logoutCleanup(nuxtApp?: unknown): Promise<void>;
}

declare module '~~/shared/cloud/provider-ids' {
    export const CLERK_PROVIDER_ID: 'clerk';
}

declare module '~~/server/auth/types' {
    import type { H3Event } from 'h3';

    export interface ProviderSession {
        provider: string;
        user: { id: string; email?: string; displayName?: string };
        expiresAt: Date;
        claims?: Record<string, unknown>;
    }

    export interface AuthProvider {
        name: string;
        getSession(event: H3Event): Promise<ProviderSession | null>;
    }
}

declare module '~~/server/auth/registry' {
    import type { AuthProvider } from '~~/server/auth/types';

    export function registerAuthProvider(input: {
        id: string;
        order?: number;
        create: () => AuthProvider;
    }): void;
}

declare module '~~/server/auth/token-broker/types' {
    import type { H3Event } from 'h3';

    export interface ProviderTokenRequest {
        providerId: string;
        template?: string;
    }

    export interface ProviderTokenBroker {
        getProviderToken(event: H3Event, req: ProviderTokenRequest): Promise<string | null>;
    }
}

declare module '~~/server/auth/token-broker/registry' {
    import type { ProviderTokenBroker } from '~~/server/auth/token-broker/types';

    export function registerProviderTokenBroker(id: string, create: () => ProviderTokenBroker): void;
}

declare module '~~/server/admin/providers/types' {
    import type { H3Event } from 'h3';

    export type ProviderStatusContext = { enabled: boolean; provider: string };
    export interface ProviderAdminStatusResult {
        details?: Record<string, unknown>;
        warnings: { level: 'warning' | 'error'; message: string }[];
        actions: { id: string; label: string; description?: string; danger?: boolean }[];
    }

    export interface ProviderAdminAdapter {
        id: string;
        kind: 'auth' | 'sync' | 'storage';
        getStatus(event: H3Event, ctx: ProviderStatusContext): Promise<ProviderAdminStatusResult>;
    }
}

declare module '~~/server/admin/providers/registry' {
    import type { ProviderAdminAdapter } from '~~/server/admin/providers/types';

    export function registerProviderAdminAdapter(adapter: ProviderAdminAdapter): void;
}

declare module '~/composables/auth/useAuthTokenBroker.client' {
    export interface ProviderTokenRequest {
        providerId: string;
        template?: string;
    }

    export function registerAuthTokenBroker(create: () => {
        getProviderToken(input: ProviderTokenRequest): Promise<string | null>;
    }): void;
}

declare module '~/composables/auth/useClientAuthStatus.client' {
    export function registerClientAuthStatusResolver(resolve: () => Promise<{
        ready: boolean;
        authenticated: boolean | undefined;
    }>): void;
}

declare module '#app' {
    export { useNuxtApp } from 'nuxt/app';
    import type { Component } from 'vue';

    interface NuxtApp {
        $registerAuthUiAdapter?: (input: {
            id: string;
            component: Component;
        }) => void;
        $registerLockPageAdapter?: (input: {
            id: string;
            component: Component;
        }) => void;
    }
}
