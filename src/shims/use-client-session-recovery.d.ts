export type ClientSessionRecovery = () => boolean | Promise<boolean>;

export declare function registerClientSessionRecovery(
    recover: ClientSessionRecovery
): void;

export declare function recoverClientSession(): Promise<boolean>;
