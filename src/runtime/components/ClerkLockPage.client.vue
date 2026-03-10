<template>
    <div class="space-y-3">
        <SignedOut>
            <SignInButton mode="modal">
                <UButton
                    block
                    size="xl"
                    color="primary"
                    :icon="loginIcon"
                    class="theme-shadow"
                >
                    Sign in
                </UButton>
            </SignInButton>
        </SignedOut>

        <SignedIn>
            <UButton
                block
                size="xl"
                color="neutral"
                variant="outline"
                :to="'/'"
            >
                Continue
            </UButton>
        </SignedIn>

        <p class="text-sm text-[var(--md-on-surface-variant)] text-center">
            Sign in with your configured identity provider to continue.
        </p>
    </div>
</template>

<script setup lang="ts">
import { SignInButton, SignedIn, SignedOut } from '@clerk/vue';

const loginIcon = 'i-lucide-log-in';
</script>