import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '~~/shared/cloud/provider-ids': path.resolve(
                __dirname,
                'src/test-shims/provider-ids.ts'
            ),
            '~~/shared/testing/contracts/authorization': path.resolve(
                __dirname,
                'src/test-shims/authorization-contract.ts'
            ),
            '~~/server/auth/registry': path.resolve(
                __dirname,
                'src/test-shims/auth-registry.ts'
            ),
            '~~/server/auth/token-broker/registry': path.resolve(
                __dirname,
                'src/test-shims/token-broker-registry.ts'
            ),
            '~~/server/admin/providers/registry': path.resolve(
                __dirname,
                'src/test-shims/admin-provider-registry.ts'
            ),
            '~/composables/auth/useAuthTokenBroker.client': path.resolve(
                __dirname,
                'src/test-shims/auth-token-broker.ts'
            ),
            '~/composables/auth/useClientAuthStatus.client': path.resolve(
                __dirname,
                'src/test-shims/client-auth-status.ts'
            ),
            '~/composables/auth/useClientSessionRecovery': path.resolve(
                __dirname,
                'src/test-shims/use-client-session-recovery.ts'
            ),
            '~/composables/auth/useSessionContext': path.resolve(
                __dirname,
                'src/test-shims/session-context.ts'
            ),
            '~/composables/auth/confirmClientSignedOut': path.resolve(
                __dirname,
                'src/test-shims/confirm-client-signed-out.ts'
            ),
            '~/utils/logout-cleanup': path.resolve(
                __dirname,
                'src/test-shims/logout-cleanup.ts'
            ),
            '#imports': path.resolve(
                __dirname,
                'src/test-shims/nuxt-imports.ts'
            ),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/__tests__/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        testTimeout: 10000,
    },
});
