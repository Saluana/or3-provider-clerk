import { logoutCleanup } from '~/utils/logout-cleanup';
import { useSessionContext } from '~/composables/auth/useSessionContext';
import { confirmClientSignedOut } from '~/composables/auth/confirmClientSignedOut';
import { waitForClerk } from '../lib/wait-for-clerk.client';

export default defineNuxtPlugin(async () => {
    if (import.meta.server) return;
    const runtimeConfig = useRuntimeConfig();
    if (!runtimeConfig.public.ssrAuthEnabled) return;

    const { refresh, data } = useSessionContext();
    const nuxtApp = useNuxtApp();
    const clerk = await waitForClerk();
    if (!clerk?.addListener) return;

    const unsubscribe = clerk.addListener(async () => {
        await refresh();

        // Fast path: Clerk still has a client session — never tear down.
        if (clerk.session) {
            return;
        }

        // Require sustained signed-out confirmation to ignore HMR flickers.
        if (!(await confirmClientSignedOut())) {
            return;
        }

        if (data.value?.session?.authenticated) {
            return;
        }

        await logoutCleanup(nuxtApp as unknown as Parameters<typeof logoutCleanup>[0]);
    });

    if (import.meta.hot) {
        import.meta.hot.dispose(() => {
            unsubscribe();
        });
    }
});
