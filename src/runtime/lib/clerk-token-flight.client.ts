/**
 * Process-wide single-flight for Clerk session.getToken calls.
 * HMR remounts and sync retries can otherwise stampede token fetches.
 */

const GLOBAL_KEY = '__or3_clerk_get_token_flight__';

type TokenFlightRegistry = {
  inflight: Map<string, Promise<string | null>>;
};

function getRegistry(): TokenFlightRegistry {
  const globalAny = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: TokenFlightRegistry;
  };
  if (!globalAny[GLOBAL_KEY]) {
    globalAny[GLOBAL_KEY] = { inflight: new Map() };
  }
  return globalAny[GLOBAL_KEY]!;
}

function flightKey(template: string | undefined): string {
  return template ?? '__default__';
}

export async function getClerkTokenOnce(
  getToken: (options?: { template?: string }) => Promise<string | null>,
  template?: string
): Promise<string | null> {
  const registry = getRegistry();
  const key = flightKey(template);
  const existing = registry.inflight.get(key);
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
    registry.inflight.delete(key);
  });

  registry.inflight.set(key, promise);
  return promise;
}

/** Test helper — clears in-flight token fetches. */
export function resetClerkTokenFlightForTests(): void {
  getRegistry().inflight.clear();
}
