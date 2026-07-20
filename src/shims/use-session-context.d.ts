import type { ComputedRef, Ref } from 'vue';

interface SessionInfo {
    authenticated?: boolean;
    [key: string]: unknown;
}

interface SessionPayload {
    session: SessionInfo | null;
}

export declare function useSessionContext(): {
    data: ComputedRef<SessionPayload | null>;
    pending: Ref<boolean>;
    error: Ref<Error | null>;
    refresh: () => Promise<void>;
};
