import { describe, expect, it } from 'vitest';
import { keepHandshakeCookies } from '../handshake-cookies';

// Ways this can fail:
// - an unsecured `SameSite=None` cookie is passed through and the browser drops it
// - a valid `SameSite=None; Secure` cookie is downgraded
// - several Set-Cookie headers are folded into one unparseable header
// - the redirect status, Location, or other headers are lost
// - a non-Response result (no handshake) is replaced

function handshake(cookies: string[]): Response {
    const headers = new Headers({
        location: 'http://localhost:3210/',
        'cache-control': 'no-store',
    });
    for (const cookie of cookies) headers.append('set-cookie', cookie);
    return new Response(null, { status: 307, headers });
}

describe('keepHandshakeCookies', () => {
    it('makes unsecured SameSite=None cookies storable', () => {
        const result = keepHandshakeCookies(
            handshake([
                '__session_x=token; Path=/; Expires=Thu, 11 Nov 2027 18:00:17 GMT; SameSite=None',
                '__refresh_x=r; Path=/; HttpOnly; samesite=none',
            ])
        ) as Response;

        expect(result.headers.getSetCookie()).toEqual([
            '__session_x=token; Path=/; Expires=Thu, 11 Nov 2027 18:00:17 GMT; SameSite=Lax',
            '__refresh_x=r; Path=/; HttpOnly; SameSite=Lax',
        ]);
    });

    it('keeps the redirect and its other headers', () => {
        const result = keepHandshakeCookies(
            handshake(['__session=t; Path=/; SameSite=None'])
        ) as Response;

        expect(result.status).toBe(307);
        expect(result.headers.get('location')).toBe('http://localhost:3210/');
        expect(result.headers.get('cache-control')).toBe('no-store');
    });

    it('rewrites only the cookies a browser would discard', () => {
        const result = keepHandshakeCookies(
            handshake([
                '__client_uat=1; Path=/; SameSite=None; Secure',
                '__session=t; Path=/; SameSite=None',
                '__clerk_redirect_count=1; SameSite=Lax; HttpOnly; Max-Age=2',
            ])
        ) as Response;

        expect(result.headers.getSetCookie()).toEqual([
            '__client_uat=1; Path=/; SameSite=None; Secure',
            '__session=t; Path=/; SameSite=Lax',
            '__clerk_redirect_count=1; SameSite=Lax; HttpOnly; Max-Age=2',
        ]);
    });

    it('returns the same response when every cookie is already valid', () => {
        const response = handshake([
            '__session=t; Path=/; Secure; SameSite=None',
            '__clerk_redirect_count=1; SameSite=Lax; HttpOnly; Max-Age=2',
        ]);

        expect(keepHandshakeCookies(response)).toBe(response);
    });

    it('passes through results that are not a response', () => {
        expect(keepHandshakeCookies(undefined)).toBeUndefined();
        const value = { ok: true };
        expect(keepHandshakeCookies(value)).toBe(value);
    });
});
