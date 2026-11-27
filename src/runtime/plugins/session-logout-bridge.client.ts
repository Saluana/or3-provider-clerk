import { defineNuxtPlugin, useNuxtApp, useRuntimeConfig } from '#imports';
import { logoutCleanup } from '~/utils/logout-cleanup';
import { useSessionContext } from '~/composables/auth/useSessionContext';
import { confirmClientSignedOut } from '~/composables/auth/confirmClientSignedOut';
import { waitForClerk } from '../lib/wait-for-clerk.client';

export default defineNuxtPlugin(async () => {
    if (import.meta.server) return;
    const runtimeConfig = useRuntimeConfig();
    if (!runtimeConfig.public.ssrAuthEnabled) return;
    if (runtimeConfig.public.authProvider && runtimeConfig.public.authProvider !== 'clerk') return;

    const { refresh, data } = useSessionContext({ autoLoad: false });
    const nuxtApp = useNuxtApp();
    const clerk = await waitForClerk();
    if (!clerk?.addListener) return;

    let observedSessionId: string | null | undefined;
    let generation = 0;
    const unsubscribe = clerk.addListener(async () => {
        // Clerk also notifies for resource and token updates. A stable session
        // is not an auth transition and must not consume the host's IP budget.
        const currentSession = clerk.session;
        const sessionId = currentSession?.id ?? null;
        const firstObservation = observedSessionId === undefined;
        if (sessionId === observedSessionId) return;
        observedSessionId = sessionId;
        const observedGeneration = ++generation;
        const hostSession = data.value?.session;
        if (firstObservation && (
            (!currentSession && !hostSession?.authenticated)
            || (currentSession?.user?.id && hostSession?.authenticated &&
                hostSession.providerUserId === currentSession.user.id)
        )) return;

        // A real identity transition needs a fresh check, not an in-flight
        // validation started for the previous identity.
        try {
            await refresh();
        } catch (error) {
            const status = (error as { statusCode?: number } | null)?.statusCode;
            // Retry a transient failure once, but never retry a client error
            // (especially 429) or resurrect a superseded identity.
            if (status && status < 500 && status !== 408) return;
            await new Promise((resolve) => setTimeout(resolve, 2_500));
            if (generation !== observedGeneration || (clerk.session?.id ?? null) !== sessionId) return;
            try {
                await refresh();
            } catch (retryError) {
                console.warn('[clerk-session-bridge] Could not refresh workspace session', retryError);
                return;
            }
        }
        if (currentSession || clerk.session || generation !== observedGeneration) return;

        // Require sustained signed-out confirmation to ignore HMR flickers.
        if (!(await confirmClientSignedOut())) return;
        if (clerk.session || generation !== observedGeneration || data.value?.session?.authenticated) return;

        await logoutCleanup(nuxtApp as unknown as Parameters<typeof logoutCleanup>[0]);
    });

    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            ++generation;
            unsubscribe();
        });
    }
});
