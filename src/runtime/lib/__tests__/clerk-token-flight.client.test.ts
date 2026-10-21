import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getClerkTokenOnce,
    resetClerkTokenFlightForTests,
} from '../clerk-token-flight.client';

describe('getClerkTokenOnce', () => {
    beforeEach(() => {
        resetClerkTokenFlightForTests();
    });

    afterEach(() => {
        resetClerkTokenFlightForTests();
    });

    it('deduplicates concurrent getToken calls for the same template', async () => {
        let resolveToken: ((value: string | null) => void) | null = null;
        const getToken = vi.fn(
            () =>
                new Promise<string | null>((resolve) => {
                    resolveToken = resolve;
                })
        );

        const first = getClerkTokenOnce(getToken, 'convex-sync');
        const second = getClerkTokenOnce(getToken, 'convex-sync');

        expect(getToken).toHaveBeenCalledTimes(1);

        resolveToken?.('jwt-token');
        await expect(first).resolves.toBe('jwt-token');
        await expect(second).resolves.toBe('jwt-token');
    });

    it('allows separate flights for different templates', async () => {
        const getToken = vi.fn(async (options?: { template?: string }) => {
            return `token-${options?.template ?? 'default'}`;
        });

        const [a, b] = await Promise.all([
            getClerkTokenOnce(getToken, 'convex-sync'),
            getClerkTokenOnce(getToken, 'other'),
        ]);

        expect(a).toBe('token-convex-sync');
        expect(b).toBe('token-other');
        expect(getToken).toHaveBeenCalledTimes(2);
    });

    it('allows a new request after the previous inflight settles', async () => {
        const getToken = vi
            .fn()
            .mockResolvedValueOnce('first')
            .mockResolvedValueOnce('second');

        await expect(getClerkTokenOnce(getToken, 'convex-sync')).resolves.toBe('first');
        await expect(getClerkTokenOnce(getToken, 'convex-sync')).resolves.toBe('second');
        expect(getToken).toHaveBeenCalledTimes(2);
    });

    it('never shares a pending token across sessions after an account switch', async () => {
        let resolveFirst!: (token: string) => void;
        const oldSession = { getToken: vi.fn(() => new Promise<string>((resolve) => { resolveFirst = resolve; })) };
        const newSession = { getToken: vi.fn(async () => 'new-user-token') };
        const first = getClerkTokenOnce(() => oldSession.getToken(), 'convex-sync', oldSession);
        const second = getClerkTokenOnce(() => newSession.getToken(), 'convex-sync', newSession);

        resolveFirst('old-user-token');
        await expect(first).resolves.toBe('old-user-token');
        await expect(second).resolves.toBe('new-user-token');
    });
});
