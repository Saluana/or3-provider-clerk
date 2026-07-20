import 'vue';

declare module 'vue' {
    interface ComponentCustomProperties {
        $registerAuthUiAdapter?: (input: {
            id: string;
            component: unknown;
        }) => void;
        $registerLockPageAdapter?: (input: {
            id: string;
            component: unknown;
        }) => void;
    }
}

