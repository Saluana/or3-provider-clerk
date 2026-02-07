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

declare module '~/composables/auth/useSessionContext' {
    import type { Ref, ComputedRef } from 'vue';

    interface SessionInfo {
        authenticated?: boolean;
        [key: string]: unknown;
    }

    interface SessionPayload {
        session: SessionInfo | null;
    }

    export function useSessionContext(): {
        data: ComputedRef<SessionPayload | null>;
        pending: Ref<boolean>;
        error: Ref<Error | null>;
        refresh: () => Promise<void>;
    };
}
