/**
 * @module server/auth/handshake-cookies
 *
 * Purpose:
 * Keeps the cookies from Clerk's handshake redirect storable.
 *
 * Clerk refreshes an expired session token through a handshake redirect. On a
 * plain HTTP origin the handshake returns its cookies as `SameSite=None`
 * without `Secure`. Browsers discard those, so the refreshed session never
 * lands, the handshake repeats until Clerk's loop guard reports the visitor as
 * signed out, and a signed-in visitor is served the lock page.
 */

const SAME_SITE_NONE = /;\s*SameSite=None/i;

function isDiscarded(cookie: string): boolean {
    return SAME_SITE_NONE.test(cookie) && !/;\s*Secure/i.test(cookie);
}

/**
 * Rewrites `SameSite=None` cookies that lack `Secure` to `SameSite=Lax`.
 * Anything else, including a result that is not a response, is returned as is.
 */
export function keepHandshakeCookies<T>(result: T): T | Response {
    if (!(result instanceof Response)) return result;
    const cookies = result.headers.getSetCookie();
    if (!cookies.some(isDiscarded)) return result;

    const headers = new Headers(result.headers);
    headers.delete('set-cookie');
    for (const cookie of cookies) {
        headers.append(
            'set-cookie',
            isDiscarded(cookie)
                ? cookie.replace(SAME_SITE_NONE, '; SameSite=Lax')
                : cookie
        );
    }
    return new Response(null, { status: result.status, headers });
}
