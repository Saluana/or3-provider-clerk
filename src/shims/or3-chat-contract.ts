/** Standalone host contract fixture used by the provider release typecheck. */
export type AuthProvider = any;
export type ProviderSession = any;
export type ProviderAdminAdapter = any;
export type ProviderAdminStatusResult = any;
export type ProviderStatusContext = any;
export type ProviderTokenBroker = any;
export type ProviderTokenRequest = any;

export const CLERK_PROVIDER_ID = 'clerk' as const;
export const registerAuthProvider = (..._args: any[]): any => undefined;
export const registerProviderTokenBroker = (..._args: any[]): any => undefined;
export const registerProviderAdminAdapter = (..._args: any[]): any => undefined;
export const registerAuthTokenBroker = (..._args: any[]): any => undefined;
export const registerClientAuthStatusResolver = (..._args: any[]): any => undefined;
export const registerClientSessionRecovery = (..._args: any[]): any => undefined;
export const logoutCleanup = async (..._args: any[]): Promise<void> => undefined;
export const useSessionContext = (..._args: any[]): any => undefined;
export const confirmClientSignedOut = async (..._args: any[]): Promise<boolean> => true;
