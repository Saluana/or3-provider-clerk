import { defineNuxtModule, installModule, addPlugin, addServerHandler, addServerPlugin, createResolver } from '@nuxt/kit';

export default defineNuxtModule({
    meta: { name: 'or3-provider-clerk' },
    async setup() {
        const { resolve } = createResolver(import.meta.url);

        await installModule('@clerk/nuxt');

        addServerHandler({
            route: '',
            middleware: true,
            handler: resolve('runtime/server/middleware/00.clerk'),
        });
        addServerPlugin(resolve('runtime/server/plugins/register'));
        addPlugin(resolve('runtime/plugins/auth-token-broker.client'), {
            append: true,
        });
        addPlugin(resolve('runtime/plugins/session-logout-bridge.client'), {
            append: true,
        });
    },
});
