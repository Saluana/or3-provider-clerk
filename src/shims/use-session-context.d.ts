import type { ComputedRef, Ref } from 'vue';

interface SessionInfo {
    authenticated?: boolean;
    user?: { id?: string };
    workspace?: { id?: string };
    role?: 'owner' | 'editor' | 'viewer';
    entitlements?: string[];
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

export declare function getCachedSessionContext(): SessionInfo | null;
