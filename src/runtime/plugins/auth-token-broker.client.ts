import { defineNuxtPlugin, useRuntimeConfig } from '#imports';
import { registerAuthTokenBroker } from '~/composables/auth/useAuthTokenBroker.client';
import {
    registerClientAuthStatusResolver,
} from '~/composables/auth/useClientAuthStatus.client';
import { registerClientSessionRecovery } from '~/composables/auth/useClientSessionRecovery';
import { getClerkTokenOnce } from '../lib/clerk-token-flight.client';
import { waitForClerk } from '../lib/wait-for-clerk.client';

export default defineNuxtPlugin(() => {
    if (import.meta.server) return;
    const runtimeConfig = useRuntimeConfig();
    if (!runtimeConfig.public.ssrAuthEnabled) return;

    registerAuthTokenBroker(() => ({
        async getProviderToken(input) {
            const clerk = await waitForClerk();
            if (!clerk?.session?.getToken) {
                return null;
            }

            return await getClerkTokenOnce(
                (options) => clerk.session!.getToken!(options),
                input.template
            );
        },
    }));

    registerClientSessionRecovery(async () => {
        const clerk = await waitForClerk(5000);
        if (!clerk?.loaded) return false;
        if (!clerk.session?.getToken) return false;

        // Touch the session token so Clerk can refresh cookies if needed.
        await getClerkTokenOnce((options) => clerk.session!.getToken!(options));
        return true;
    });

    registerClientAuthStatusResolver(async () => {
        const clerk = await waitForClerk(2000);
        if (!clerk?.loaded) {
            return { ready: false, authenticated: undefined };
        }
        return {
            ready: true,
            authenticated: Boolean(clerk.session),
        };
    });
});
