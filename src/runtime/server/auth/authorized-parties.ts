import { createError, type H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';

function canonicalOrigin(value: string): string | null {
    try {
        const url = new URL(value);
        if (
            !['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            url.pathname !== '/' || url.search || url.hash || url.origin !== value
        ) return null;
        return url.origin;
    } catch {
        return null;
    }
}

/** Trusted deployment configuration, never the untrusted request Host/Origin. */
export function getClerkAuthorizedParties(event: H3Event): string[] {
    const config = useRuntimeConfig(event) as {
        security?: { allowedOrigins?: string[] };
    };
    const domain = process.env.OR3_PUBLIC_DOMAIN?.trim();
    const publicOrigin = domain && !/^(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(domain)
        ? canonicalOrigin(domain.includes('://') ? domain : `https://${domain}`)
        : null;
    const parties = new Set<string>();
    for (const value of config.security?.allowedOrigins ?? []) {
        const origin = canonicalOrigin(value);
        if (origin) parties.add(origin);
    }
    if (publicOrigin) parties.add(publicOrigin);
    if (parties.size === 0) {
        throw createError({
            statusCode: 503,
            statusMessage: 'Clerk authorized origins are not configured',
        });
    }
    return [...parties];
}
