export function defineNuxtPlugin<T>(plugin: T): T | unknown {
    const definePlugin = (
        globalThis as typeof globalThis & {
            defineNuxtPlugin?: (candidate: T) => unknown;
        }
    ).defineNuxtPlugin;
    return definePlugin ? definePlugin(plugin) : plugin;
}

export function useRuntimeConfig(event?: unknown): unknown {
    const runtimeConfig = (
        globalThis as typeof globalThis & {
            useRuntimeConfig?: (candidate?: unknown) => unknown;
        }
    ).useRuntimeConfig;
    if (!runtimeConfig) {
        throw new Error('useRuntimeConfig must be mocked in tests');
    }
    return runtimeConfig(event);
}

export function useNuxtApp(): unknown {
    const resolveNuxtApp = (
        globalThis as typeof globalThis & {
            useNuxtApp?: () => unknown;
        }
    ).useNuxtApp;
    if (!resolveNuxtApp) {
        throw new Error('useNuxtApp must be mocked in tests');
    }
    return resolveNuxtApp();
}
