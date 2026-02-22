import { CLERK_PROVIDER_ID } from '~~/shared/cloud/provider-ids';
import { registerAuthProvider } from '~~/server/auth/registry';
import { registerProviderTokenBroker } from '~~/server/auth/token-broker/registry';
import { registerProviderAdminAdapter } from '~~/server/admin/providers/registry';
import { clerkAuthProvider } from '../auth/clerk-auth-provider';
import { createClerkTokenBroker } from '../token-broker/clerk-token-broker';
import { clerkAdminAdapter } from '../admin/adapters/auth-clerk';
import { useRuntimeConfig } from '#imports';

type RuntimeConfigWithClerk = ReturnType<typeof useRuntimeConfig> & {
    clerkSecretKey?: string;
    public?: {
        clerkPublishableKey?: string;
    };
};

function validateClerkStartupConfig(config: RuntimeConfigWithClerk): string[] {
    const errors: string[] = [];
    const publishableKey = config.public?.clerkPublishableKey?.trim() ?? '';
    const secretKey = config.clerkSecretKey?.trim() ?? '';

    if (!publishableKey) {
        errors.push('Missing Clerk publishable key (runtimeConfig.public.clerkPublishableKey).');
    }
    if (!secretKey) {
        errors.push('Missing Clerk secret key (runtimeConfig.clerkSecretKey).');
    }

    if (process.env.NODE_ENV === 'production') {
        if (publishableKey.startsWith('pk_test_')) {
            errors.push('Refusing to start with Clerk test publishable key in production.');
        }
        if (secretKey.startsWith('sk_test_')) {
            errors.push('Refusing to start with Clerk test secret key in production.');
        }
    }

    return errors;
}

export default defineNitroPlugin(() => {
    const config = useRuntimeConfig() as RuntimeConfigWithClerk;
    if (!config.auth.enabled) return;
    if (config.auth.provider !== CLERK_PROVIDER_ID) return;

    const errors = validateClerkStartupConfig(config);
    if (errors.length > 0) {
        throw new Error(
            `[or3-provider-clerk] ${errors.join(' ')} Install/configure Clerk provider env values and restart.`
        );
    }

    registerAuthProvider({
        id: CLERK_PROVIDER_ID,
        order: 100,
        create: () => clerkAuthProvider,
    });

    registerProviderTokenBroker(CLERK_PROVIDER_ID, createClerkTokenBroker);
    registerProviderAdminAdapter(clerkAdminAdapter);
});
