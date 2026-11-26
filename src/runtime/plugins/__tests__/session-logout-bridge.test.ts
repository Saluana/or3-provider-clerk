import { beforeEach, describe, expect, it, vi } from 'vitest';

const logoutCleanup = vi.fn(async () => undefined);
vi.mock('~/utils/logout-cleanup', () => ({
    logoutCleanup,
}));

const confirmClientSignedOut = vi.fn(async () => false);
vi.mock('~/composables/auth/confirmClientSignedOut', () => ({
    confirmClientSignedOut,
}));

const sessionState = { value: { session: { authenticated: true } as any } };
const refresh = vi.fn(async () => {
    sessionState.value.session = null;
    return sessionState.value;
});
vi.mock('~/composables/auth/useSessionContext', () => ({
    useSessionContext: () => ({
        data: sessionState,
        refresh,
    }),
}));

let clerkListener: (() => void) | null = null;
const clerkClient = {
    loaded: true,
    session: null as unknown,
    addListener: (cb: () => void) => {
        clerkListener = cb;
        return () => {
            clerkListener = null;
        };
    },
};

vi.mock('../../lib/wait-for-clerk.client', () => ({
    waitForClerk: vi.fn(async () => clerkClient),
}));

describe('session logout bridge', () => {
    beforeEach(() => {
        vi.resetModules();
        logoutCleanup.mockClear();
        confirmClientSignedOut.mockReset().mockResolvedValue(false);
        refresh.mockClear();
        sessionState.value.session = { authenticated: true, providerUserId: "user-1" };
        clerkClient.session = { id: 'sess-1', user: { id: 'user-1' } };
        clerkListener = null;
        (globalThis as typeof globalThis & { Clerk?: unknown }).Clerk = clerkClient;
        (globalThis as typeof globalThis & { defineNuxtPlugin?: unknown }).defineNuxtPlugin =
            (plugin: () => unknown) => plugin();
        (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig =
            () => ({
                public: { ssrAuthEnabled: true, authProvider: 'clerk' },
            });
        (globalThis as typeof globalThis & { useNuxtApp?: unknown }).useNuxtApp = () => ({
            $syncEngine: { stop: vi.fn() },
        });
    });

    it('clears workspace DBs when Clerk reports sign-out and confirmation succeeds', async () => {
        clerkClient.session = null;
        confirmClientSignedOut.mockResolvedValue(true);
        await import('../../plugins/session-logout-bridge.client');
        expect(typeof clerkListener).toBe('function');
        await clerkListener?.();
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(confirmClientSignedOut).toHaveBeenCalledTimes(1);
        expect(logoutCleanup).toHaveBeenCalledTimes(1);
    });

    it('ignores SDK notifications for the same active provider session', async () => {
        await import('../../plugins/session-logout-bridge.client');
        await clerkListener?.();
        clerkClient.session = { id: 'sess-1', user: { id: 'user-1' } };
        await Promise.all([clerkListener?.(), clerkListener?.(), clerkListener?.()]);
        expect(refresh).not.toHaveBeenCalled();
        expect(logoutCleanup).not.toHaveBeenCalled();
    });

    it('checks a switched provider session once without tearing down local data', async () => {
        await import('../../plugins/session-logout-bridge.client');
        await clerkListener?.();
        clerkClient.session = { id: 'sess-2', user: { id: 'user-2' } };
        await Promise.all([clerkListener?.(), clerkListener?.(), clerkListener?.()]);
        expect(refresh).toHaveBeenCalledTimes(1);
        expect(confirmClientSignedOut).not.toHaveBeenCalled();
        expect(logoutCleanup).not.toHaveBeenCalled();
    });

    it('retries a rejected transition once without waiting for another Clerk event', async () => {
        vi.useFakeTimers();
        try {
            await import('../../plugins/session-logout-bridge.client');
            await clerkListener?.();
            clerkClient.session = { id: 'sess-2', user: { id: 'user-2' } };
            refresh.mockRejectedValueOnce(new Error('temporary transport failure'));
            const changed = clerkListener?.();
            await vi.advanceTimersByTimeAsync(3_000);
            await changed;
            expect(refresh).toHaveBeenCalledTimes(2);
            expect(logoutCleanup).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('does not clear workspace DBs when sign-out is not confirmed', async () => {
        clerkClient.session = null;
        confirmClientSignedOut.mockResolvedValue(false);
        await import('../../plugins/session-logout-bridge.client');
        await clerkListener?.();
        expect(confirmClientSignedOut).toHaveBeenCalledTimes(1);
        expect(logoutCleanup).toHaveBeenCalledTimes(0);
    });

    it.each([
        { ssrAuthEnabled: true, authProvider: 'basic-auth' },
        { ssrAuthEnabled: false, authProvider: 'clerk' },
    ])('does not subscribe to Clerk logout when inactive for %j', async (publicConfig) => {
        (globalThis as typeof globalThis & { useRuntimeConfig?: unknown }).useRuntimeConfig =
            () => ({ public: publicConfig });
        clerkClient.session = null;
        confirmClientSignedOut.mockResolvedValue(true);
        await import('../../plugins/session-logout-bridge.client');

        expect(clerkListener).toBeNull();
        expect(refresh).not.toHaveBeenCalled();
        expect(logoutCleanup).not.toHaveBeenCalled();
    });
});
