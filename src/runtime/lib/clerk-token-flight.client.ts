/**
 * Process-wide single-flight for Clerk session.getToken calls.
 * HMR remounts and sync retries can otherwise stampede token fetches.
 */

const GLOBAL_KEY = '__or3_clerk_get_token_flight__';

type TokenFlightRegistry = {
  inflight: WeakMap<object, Map<string | undefined, Promise<string | null>>>;
};

function getRegistry(): TokenFlightRegistry {
  const globalAny = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: TokenFlightRegistry;
  };
  if (!globalAny[GLOBAL_KEY]) {
    globalAny[GLOBAL_KEY] = { inflight: new WeakMap() };
  }
  return globalAny[GLOBAL_KEY]!;
}

export async function getClerkTokenOnce(
  getToken: (options?: { template?: string }) => Promise<string | null>,
  template?: string,
  session: object = getToken
): Promise<string | null> {
  const registry = getRegistry();
  let inflight = registry.inflight.get(session);
  if (!inflight) {
    inflight = new Map();
    registry.inflight.set(session, inflight);
  }
  const existing = inflight.get(template);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      return await getToken(template ? { template } : undefined);
    } catch {
      return null;
    }
  })().finally(() => {
    inflight.delete(template);
  });

  inflight.set(template, promise);
  return promise;
}

/** Test helper — clears in-flight token fetches. */
export function resetClerkTokenFlightForTests(): void {
  getRegistry().inflight = new WeakMap();
}
