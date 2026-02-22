import { describe, it, expect, vi } from 'vitest';
import type { H3Event } from 'h3';
import { clerkAuthProvider } from '../../auth/clerk-auth-provider';

const { clerkClientMock, clerkMiddlewareMock } = vi.hoisted(() => ({
    clerkClientMock: vi.fn(() => ({
        users: {
            getUser: vi.fn(),
        },
    })),
    clerkMiddlewareMock: vi.fn(),
}));

vi.mock('@clerk/nuxt/server', () => ({
    clerkClient: clerkClientMock,
    clerkMiddleware: clerkMiddlewareMock,
}));

describe('clerkAuthProvider', () => {
    it('bootstraps auth context via clerkMiddleware when auth is missing', async () => {
        clerkMiddlewareMock.mockReturnValue(async (event: H3Event) => {
            event.context.auth = () => ({
                userId: null,
                sessionClaims: { exp: 1 },
            });
        });

        const event = { context: {}, node: { req: { headers: {} } } } as unknown as H3Event;

        await expect(clerkAuthProvider.getSession(event)).resolves.toBeNull();
        expect(clerkMiddlewareMock).toHaveBeenCalledTimes(1);
    });

    it('returns null when auth remains missing after bootstrap', async () => {
        clerkMiddlewareMock.mockReturnValue(async () => {
            // no-op: auth context remains unset
        });

        const event = { context: {}, node: { req: { headers: {} } } } as unknown as H3Event;
        await expect(clerkAuthProvider.getSession(event)).resolves.toBeNull();
    });
});
