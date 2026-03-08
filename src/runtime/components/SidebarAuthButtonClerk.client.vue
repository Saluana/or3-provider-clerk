<template>
    <SignedIn>
        <div
            class="h-[54px] w-[54px] flex items-center justify-center cursor-pointer rounded-[var(--md-border-radius)] hover:bg-[var(--md-surface-hover)]! transition-colors"
        >
            <UserButton
                :appearance="{
                    elements: {
                        avatarBox: 'w-[32px] h-[32px]',
                        userButtonTrigger: 'p-0 focus:shadow-none',
                    },
                }"
            />
        </div>
    </SignedIn>

    <SignedOut>
        <SignInButton mode="modal">
            <UButton
                type="button"
                block
                variant="ghost"
                color="neutral"
                aria-label="Sign In"
                class="theme-btn h-[48px] w-[48px] p-0! flex flex-col items-center justify-center gap-1 py-1.5 bg-transparent border-[length:var(--md-border-width)] border-[color:var(--md-primary)]/30 rounded-[var(--md-border-radius)] text-[var(--md-primary)] hover:bg-[var(--md-primary)]/15 active:bg-[var(--md-primary)]/25 transition-colors duration-150 shadow-none"
                :ui="{ base: 'justify-center shadow-none' }"
            >
                <template #default>
                    <span class="flex flex-col items-center gap-1 w-full">
                        <UIcon name="i-lucide-log-in" class="h-[18px] w-[18px]" />
                        <span class="text-[7px] uppercase tracking-wider whitespace-nowrap">
                            Login
                        </span>
                    </span>
                </template>
            </UButton>
        </SignInButton>
    </SignedOut>
</template>

<script setup lang="ts">
import {
    SignInButton,
    SignedIn,
    SignedOut,
    UserButton,
} from '@clerk/vue';
</script>
