import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerAuthProviderMock = vi.hoisted(() => vi.fn());
const registerProviderTokenBrokerMock = vi.hoisted(() => vi.fn());
const registerProviderAdminAdapterMock = vi.hoisted(() => vi.fn());
const useRuntimeConfigMock = vi.hoisted(() => vi.fn());

vi.mock('~~/server/auth/registry', () => ({
    registerAuthProvider: registerAuthProviderMock as unknown,
}));

vi.mock('~~/server/auth/token-broker/registry', () => ({
    registerProviderTokenBroker: registerProviderTokenBrokerMock as unknown,
}));

vi.mock('~~/server/admin/providers/registry', () => ({
    registerProviderAdminAdapter: registerProviderAdminAdapterMock as unknown,
}));

vi.mock('#imports', () => ({
    useRuntimeConfig: (...args: unknown[]) => useRuntimeConfigMock(...args),
}));

vi.mock('../../auth/clerk-auth-provider', () => ({
    clerkAuthProvider: { name: 'clerk', getSession: vi.fn() },
}));

vi.mock('../../token-broker/clerk-token-broker', () => ({
    createClerkTokenBroker: vi.fn(),
}));

vi.mock('../../admin/adapters/auth-clerk', () => ({
    clerkAdminAdapter: { id: 'clerk', kind: 'auth', getStatus: vi.fn() },
}));

describe('clerk register plugin', () => {
    beforeEach(() => {
        vi.resetModules();
        registerAuthProviderMock.mockReset();
        registerProviderTokenBrokerMock.mockReset();
        registerProviderAdminAdapterMock.mockReset();
        useRuntimeConfigMock.mockReset();
        process.env.NODE_ENV = 'test';

        (globalThis as typeof globalThis & { defineNitroPlugin?: unknown }).defineNitroPlugin = (
            plugin: () => unknown
        ) => plugin();
        useRuntimeConfigMock.mockReturnValue({
            auth: { enabled: true, provider: 'clerk' },
            clerkSecretKey: 'sk_live_valid',
            public: { clerkPublishableKey: 'pk_live_valid' },
        });
    });

    it('registers when clerk config is valid', async () => {
        await import('../register');

        expect(registerAuthProviderMock).toHaveBeenCalledTimes(1);
        expect(registerProviderTokenBrokerMock).toHaveBeenCalledTimes(1);
        expect(registerProviderAdminAdapterMock).toHaveBeenCalledTimes(1);
    });

    it('fails startup when required key config is missing', async () => {
        useRuntimeConfigMock.mockReturnValue({
            auth: { enabled: true, provider: 'clerk' },
            clerkSecretKey: '',
            public: { clerkPublishableKey: '' },
        });

        await expect(import('../register')).rejects.toThrow('Missing Clerk publishable key');
        expect(registerAuthProviderMock).not.toHaveBeenCalled();
    });

    it('fails startup when test keys are used in production', async () => {
        process.env.NODE_ENV = 'production';
        useRuntimeConfigMock.mockReturnValue({
            auth: { enabled: true, provider: 'clerk' },
            clerkSecretKey: 'sk_test_example',
            public: { clerkPublishableKey: 'pk_test_example' },
        });

        await expect(import('../register')).rejects.toThrow(
            'Refusing to start with Clerk test publishable key in production.'
        );
        expect(registerAuthProviderMock).not.toHaveBeenCalled();
    });
});
