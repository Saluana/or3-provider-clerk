import { describe, it, expect, vi } from 'vitest';
import type { H3Event } from 'h3';
import { clerkAuthProvider } from '../../auth/clerk-auth-provider';
import {
    verifyAuthorizationContract,
    type AuthorizationCaseId,
} from '~~/shared/testing/contracts/authorization';

const { clerkClientMock, clerkMiddlewareMock, getUserMock } = vi.hoisted(() => ({
    getUserMock: vi.fn(),
    clerkClientMock: vi.fn(() => ({
        users: {
            getUser: getUserMock,
        },
    })),
    clerkMiddlewareMock: vi.fn(),
}));

vi.mock('@clerk/nuxt/server', () => ({
    clerkClient: clerkClientMock,
    clerkMiddleware: clerkMiddlewareMock,
}));

describe('clerkAuthProvider', () => {
    it('executes the shared unauthenticated and verified-email contract', async () => {
        const supported = new Set<AuthorizationCaseId>([
            'unauthenticated', 'subject-match', 'unverified-email',
        ]);
        const result = await verifyAuthorizationContract({
            name: 'clerk',
            supports: supported,
            async evaluate(id) {
                const authenticated = id !== 'unauthenticated';
                getUserMock.mockResolvedValue({
                    primaryEmailAddressId: 'email-1',
                    emailAddresses: [{
                        id: 'email-1',
                        emailAddress: 'person@example.com',
                        verification: {
                            status: id === 'unverified-email' ? 'unverified' : 'verified',
                        },
                    }],
                    firstName: 'Person',
                    username: null,
                });
                const event = { context: { auth: () => ({
                    userId: authenticated ? 'clerk-user-1' : null,
                    sessionClaims: { exp: Math.floor(Date.now() / 1000) + 60 },
                }) } } as unknown as H3Event;
                try {
                    const session = await clerkAuthProvider.getSession(event);
                    return session ? 'allow' : 'deny';
                } catch {
                    return 'deny';
                }
            },
        });
        expect(result.executed).toEqual(Array.from(supported));
    });
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

    it('rejects a primary email that is not verified', async () => {
        getUserMock.mockResolvedValue({
            primaryEmailAddressId: 'email-1',
            emailAddresses: [
                {
                    id: 'email-1',
                    emailAddress: 'person@example.com',
                    verification: { status: 'unverified' },
                },
            ],
            firstName: 'Person',
            username: null,
        });
        const event = {
            context: {
                auth: () => ({
                    userId: 'clerk-user-1',
                    sessionClaims: { exp: Math.floor(Date.now() / 1000) + 60 },
                }),
            },
        } as unknown as H3Event;

        await expect(clerkAuthProvider.getSession(event)).rejects.toThrow(
            'User has no verified primary email address'
        );
    });

    it('rejects a user without a primary email', async () => {
        getUserMock.mockResolvedValue({
            primaryEmailAddressId: null,
            emailAddresses: [],
            firstName: 'Person',
            username: null,
        });
        const event = {
            context: {
                auth: () => ({
                    userId: 'clerk-user-1',
                    sessionClaims: { exp: Math.floor(Date.now() / 1000) + 60 },
                }),
            },
        } as unknown as H3Event;

        await expect(clerkAuthProvider.getSession(event)).rejects.toThrow(
            'User has no verified primary email address'
        );
    });

    it('returns a session only for a verified primary email', async () => {
        getUserMock.mockResolvedValue({
            primaryEmailAddressId: 'email-1',
            emailAddresses: [
                {
                    id: 'email-1',
                    emailAddress: 'person@example.com',
                    verification: { status: 'verified' },
                },
            ],
            firstName: 'Person',
            username: null,
        });
        const event = {
            context: {
                auth: () => ({
                    userId: 'clerk-user-1',
                    sessionClaims: { exp: Math.floor(Date.now() / 1000) + 60 },
                }),
            },
        } as unknown as H3Event;

        await expect(clerkAuthProvider.getSession(event)).resolves.toMatchObject({
            provider: 'clerk',
            user: {
                id: 'clerk-user-1',
                email: 'person@example.com',
            },
        });
    });
});
