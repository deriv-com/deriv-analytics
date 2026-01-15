import type { PostHogAnalytics, PostHogConfig } from '../integrations/Posthog'
import type { IdentityManager } from '../core/IdentityManager'

/**
 * Wrapper for PostHog analytics provider.
 * Handles dynamic import, initialization, and identity synchronization.
 */
export class PosthogProvider {
    private instance: PostHogAnalytics | null = null
    private identityManager: IdentityManager

    constructor(identityManager: IdentityManager) {
        this.identityManager = identityManager
    }

    /**
     * Dynamically imports and initializes PostHog.
     * Only loads PostHog code when this method is called.
     *
     * @param posthogKey - The PostHog API key
     * @param posthogHost - The PostHog host URL
     * @param onReady - Callback when PostHog is ready
     * @param config - Optional PostHog configuration
     * @returns The initialized PostHog instance
     */
    async initialize(
        posthogKey: string,
        posthogHost: string,
        onReady: () => void,
        config?: PostHogConfig
    ): Promise<PostHogAnalytics> {
        // 🎯 DYNAMIC IMPORT - PostHog code only loads here
        const { PostHogAnalytics } = await import('../integrations/Posthog')

        // Use default value: false (AMD enabled by default)
        this.instance = PostHogAnalytics.getPostHogInstance(
            posthogKey,
            posthogHost,
            false, // Default: AMD enabled
            () => {
                // PostHog will use the anonymous ID from the shared cookie
                // that IdentityManager manages (rudder_anonymous_id)
                onReady()
            },
            config
        )

        return this.instance
    }

    /**
     * Check if PostHog has been initialized
     */
    get hasInitialized(): boolean {
        return this.instance?.has_initialized || false
    }

    /**
     * Get the PostHog instance (for direct access if needed)
     */
    getInstance(): PostHogAnalytics | null {
        return this.instance
    }
}
