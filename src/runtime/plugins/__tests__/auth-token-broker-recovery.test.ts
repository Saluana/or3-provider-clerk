import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerClientSessionRecovery } from '~/composables/auth/useClientSessionRecovery';
import { recoverClientSession } from '~/composables/auth/useClientSessionRecovery';

const waitForClerk = vi.fn();
const getClerkTokenOnce = vi.fn(async () => 'jwt');

vi.mock('../../lib/wait-for-clerk.client', () => ({
    waitForClerk: (...args: unknown[]) => waitForClerk(...args),
}));

vi.mock('../../lib/clerk-token-flight.client', () => ({
    getClerkTokenOnce: (...args: unknown[]) => getClerkTokenOnce(...args),
}));

vi.mock('~/composables/auth/useAuthTokenBroker.client', () => ({
    registerAuthTokenBroker: vi.fn(),
}));

vi.mock('~/composables/auth/useClientAuthStatus.client', () => ({
    registerClientAuthStatusResolver: vi.fn(),
}));

describe('clerk auth-token-broker session recovery', () => {
    beforeEach(() => {
        vi.resetModules();
        waitForClerk.mockReset();
        getClerkTokenOnce.mockReset().mockResolvedValue('jwt');
        registerClientSessionRecovery(async () => false);
        (globalThis as typeof globalThis & { defineNuxtPlugin?: unknown }).defineNuxtPlugin =
            (plugin: () => unknown) => plugin();
        (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig =
            () => ({
                public: { ssrAuthEnabled: true },
            });
    });

    afterEach(() => {
        registerClientSessionRecovery(async () => false);
    });

    it('registers recovery that returns true when Clerk has a live session', async () => {
        waitForClerk.mockResolvedValue({
            loaded: true,
            session: {
                getToken: vi.fn(async () => 'jwt'),
            },
        });

        await import('../../plugins/auth-token-broker.client');

        await expect(recoverClientSession()).resolves.toBe(true);
        expect(getClerkTokenOnce).toHaveBeenCalled();
    });

    it('registers recovery that returns false when Clerk has no session', async () => {
        waitForClerk.mockResolvedValue({
            loaded: true,
            session: null,
        });

        await import('../../plugins/auth-token-broker.client');

        await expect(recoverClientSession()).resolves.toBe(false);
        expect(getClerkTokenOnce).not.toHaveBeenCalled();
    });
});
