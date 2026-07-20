/**
 * Shared Clerk client bootstrap wait.
 * Used by token broker, auth-status, logout bridge, and session recovery.
 */

export type ClerkClient = {
  loaded?: boolean;
  session?: {
    getToken?: (options?: { template?: string }) => Promise<string | null>;
  } | null;
  addListener?: (callback: () => void) => () => void;
};

export async function waitForClerk(timeoutMs = 5000): Promise<ClerkClient | null> {
  const startTime = Date.now();

  while (Date.now() - startTime <= timeoutMs) {
    const clerk = (window as unknown as { Clerk?: ClerkClient }).Clerk;
    if (clerk?.loaded) {
      return clerk;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
}
