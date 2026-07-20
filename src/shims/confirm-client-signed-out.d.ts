export type ConfirmClientSignedOutOptions = {
    confirmMs?: number;
    sleep?: (ms: number) => Promise<void>;
};

export declare const DEFAULT_SIGNED_OUT_CONFIRM_MS: number;

export declare function confirmClientSignedOut(
    options?: ConfirmClientSignedOutOptions
): Promise<boolean>;
