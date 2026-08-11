export type ClientSessionRecovery = () => boolean | Promise<boolean>;

const GLOBAL_KEY = '__or3_clerk_test_session_recovery__';

type RecoveryRegistry = {
    recover?: ClientSessionRecovery;
};

function getRegistry(): RecoveryRegistry {
    const target = globalThis as typeof globalThis & {
        [GLOBAL_KEY]?: RecoveryRegistry;
    };
    target[GLOBAL_KEY] ??= {};
    return target[GLOBAL_KEY];
}

export function registerClientSessionRecovery(
    recover: ClientSessionRecovery
): void {
    getRegistry().recover = recover;
}

export async function recoverClientSession(): Promise<boolean> {
    const recover = getRegistry().recover;
    return recover ? await recover() : false;
}
