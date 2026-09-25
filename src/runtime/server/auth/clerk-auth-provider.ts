/**
 * @module server/auth/providers/clerk/clerk-auth-provider.ts
 *
 * Purpose:
 * Clerk-specific implementation of the SSR `AuthProvider`. This module bridges
 * Clerk's session management into the OR3 internal session model.
 *
 * Behavior:
 * 1. Retrieves the session context from the request (populated by Clerk's Nitro middleware).
 * 2. Validates the JWT expiration claim.
 * 3. Enriches the session with a short-lived verified email profile from Clerk.
 * 4. Normalizes the data into a standard `ProviderSession`.
 *
 * Constraints:
 * - Depends on correctly configured Clerk public/secret keys.
 * - Requires Clerk's SSR middleware to be active in the Nitro pipeline.
 * - Throws in development if Clerk context is missing to aid debugging.
 */
import type { H3Event } from 'h3';
import type { AuthProvider, ProviderSession } from '~~/server/auth/types';
import { CLERK_PROVIDER_ID } from '~~/shared/cloud/provider-ids';
import { clerkClient, clerkMiddleware } from '@clerk/nuxt/server';
import { createError } from 'h3';
import { getClerkAuthorizedParties } from './authorized-parties';

/**
 * Purpose:
 * Internal interface representing the structure of Clerk's auth context
 * as exposed by the `@clerk/nuxt` server integration.
 */
interface ClerkAuthContext {
    userId: string | null;
    sessionClaims: { exp?: number; [key: string]: unknown };
}

const PROFILE_TTL_MS = 30_000;
const MAX_PROFILES = 2_000;
type VerifiedProfile = { email: string; displayName: string; expiresAt: number };
const verifiedProfiles = new Map<string, VerifiedProfile>();
const profileRequests = new Map<string, Promise<VerifiedProfile | null>>();

async function getVerifiedProfile(event: H3Event, userId: string): Promise<VerifiedProfile | null> {
    const now = Date.now();
    const cached = verifiedProfiles.get(userId);
    if (cached && cached.expiresAt > now) return cached;
    if (cached) verifiedProfiles.delete(userId);

    let pending = profileRequests.get(userId);
    if (!pending) {
        pending = (async () => {
            let clerkUser;
            try {
                clerkUser = await clerkClient(event).users.getUser(userId);
            } catch (error) {
                const status = (error as { status?: number })?.status;
                if (status === 404) {
                    verifiedProfiles.delete(userId);
                    return null;
                }
                throw error;
            }
            const primaryEmail = clerkUser.emailAddresses.find(
                (email) => email.id === clerkUser.primaryEmailAddressId
            );
            if (!primaryEmail?.emailAddress || primaryEmail.verification?.status !== 'verified') {
                verifiedProfiles.delete(userId);
                throw createError({ statusCode: 403, statusMessage: 'Verified primary email required' });
            }
            const profile = {
                email: primaryEmail.emailAddress,
                displayName: clerkUser.firstName || clerkUser.username || primaryEmail.emailAddress,
                expiresAt: Date.now() + PROFILE_TTL_MS,
            };
            if (verifiedProfiles.size >= MAX_PROFILES) {
                const oldest = verifiedProfiles.keys().next().value;
                if (oldest) verifiedProfiles.delete(oldest);
            }
            verifiedProfiles.set(userId, profile);
            return profile;
        })();
        profileRequests.set(userId, pending);
        void pending.finally(() => profileRequests.delete(userId)).catch(() => undefined);
    }
    return pending;
}

/** Called by tests and explicit identity invalidation integrations. */
export function invalidateClerkProfile(userId?: string): void {
    if (userId) verifiedProfiles.delete(userId);
    else verifiedProfiles.clear();
}

/**
 * Purpose:
 * Singleton implementation of the Clerk auth provider.
 */
export const clerkAuthProvider: AuthProvider = {
    name: CLERK_PROVIDER_ID,

    /**
     * Purpose:
     * Resolves a session from Clerk's server-side context.
     *
     * Behavior:
     * - Calls the lazy `auth()` function provided by Clerk's middleware.
     * - Reuses verified profile data for up to 30 seconds while validating the
     *   request's session token every time.
     *
     * @param event - The Nitro request event.
     * @returns Normalized provider session or `null` if unauthenticated.
     */
    async getSession(event: H3Event): Promise<ProviderSession | null> {
        // Clerk middleware populates event.context.auth as a function.
        // In some middleware orderings, this may not have run yet. Bootstrap once.
        let authFn = event.context.auth as (() => unknown) | undefined;
        if (typeof authFn !== 'function') {
            const middleware = clerkMiddleware({
                authorizedParties: getClerkAuthorizedParties(event),
            });
            await middleware(event);
            authFn = event.context.auth as (() => unknown) | undefined;
        }

        if (typeof authFn !== 'function') {
            return null;
        }

        // Get auth context by calling it directly
        const auth = (authFn as (options: { acceptsToken: 'session_token' }) => unknown)({
            acceptsToken: 'session_token',
        }) as ClerkAuthContext;
        if (!auth.userId) {
            return null;
        }

        // Validate session expiry claim
        if (typeof auth.sessionClaims?.exp !== 'number' || auth.sessionClaims.exp <= Date.now() / 1000) {
            if (import.meta.dev) {
                throw new Error('Invalid or missing session expiry claim');
            }
            return null;
        }

        const profile = await getVerifiedProfile(event, auth.userId);
        if (!profile) return null;

        return {
            provider: CLERK_PROVIDER_ID,
            user: {
                id: auth.userId,
                email: profile.email,
                displayName: profile.displayName,
            },
            expiresAt: new Date(auth.sessionClaims.exp * 1000),
            claims: auth.sessionClaims,
        };
    },
};
