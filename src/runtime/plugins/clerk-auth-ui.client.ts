import { defineNuxtPlugin, useNuxtApp, useRuntimeConfig } from '#imports';

type AuthUiRegistryInput = {
    id: string;
    component: unknown;
};

type AuthUiRegistryBridge = {
    $registerAuthUiAdapter?: (input: AuthUiRegistryInput) => void;
};

type AuthUiRegistryGlobalState = typeof globalThis & {
    __or3AuthUiAdapterQueue__?: AuthUiRegistryInput[];
};

const CLERK_PROVIDER_ID = 'clerk';

function tryRegisterAuthUiAdapter(component: unknown): boolean {
    const nuxtApp = useNuxtApp() as AuthUiRegistryBridge;
    if (typeof nuxtApp.$registerAuthUiAdapter !== 'function') {
        return false;
    }

    nuxtApp.$registerAuthUiAdapter({
        id: CLERK_PROVIDER_ID,
        component,
    });
    return true;
}

function enqueueAuthUiAdapter(component: unknown): void {
    const payload: AuthUiRegistryInput = {
        id: CLERK_PROVIDER_ID,
        component,
    };
    const globalState = globalThis as AuthUiRegistryGlobalState;
    if (!Array.isArray(globalState.__or3AuthUiAdapterQueue__)) {
        globalState.__or3AuthUiAdapterQueue__ = [];
    }
    globalState.__or3AuthUiAdapterQueue__.push(payload);
    if (typeof window !== 'undefined') {
        window.dispatchEvent(
            new CustomEvent<AuthUiRegistryInput>('or3:auth-ui-adapter-register', {
                detail: payload,
            })
        );
    }
}

export default defineNuxtPlugin(async () => {
    if (import.meta.server) return;

    const runtimeConfig = useRuntimeConfig();
    if (!runtimeConfig.public?.ssrAuthEnabled) return;

    const publicProviderId = runtimeConfig.public?.authProvider;
    if (publicProviderId && publicProviderId !== CLERK_PROVIDER_ID) {
        return;
    }

    const componentModule = (await import('../components/SidebarAuthButtonClerk.client.vue')) as {
        default?: unknown;
    };

    if (!componentModule.default) {
        return;
    }

    if (!tryRegisterAuthUiAdapter(componentModule.default)) {
        enqueueAuthUiAdapter(componentModule.default);
    }
});
