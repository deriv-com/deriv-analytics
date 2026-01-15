import type { RudderStack } from '../integrations/Rudderstack'
import type { IdentityManager } from '../core/IdentityManager'

/**
 * Wrapper for RudderStack analytics provider.
 * Handles dynamic import, initialization, and identity synchronization.
 */
export class RudderstackProvider {
    private instance: RudderStack | null = null
    private identityManager: IdentityManager

    constructor(identityManager: IdentityManager) {
        this.identityManager = identityManager
    }

    /**
     * Dynamically imports and initializes RudderStack.
     * Only loads RudderStack code when this method is called.
     *
     * @param rudderstackKey - The RudderStack API key
     * @param onReady - Callback when RudderStack is ready
     * @returns The initialized RudderStack instance
     */
    async initialize(rudderstackKey: string, onReady: () => void): Promise<RudderStack> {
        // 🎯 DYNAMIC IMPORT - RudderStack code only loads here
        const { RudderStack } = await import('../integrations/Rudderstack')

        // Use default value: false (AMD enabled by default)
        this.instance = RudderStack.getRudderStackInstance(rudderstackKey, false, () => {
            // Sync RudderStack's anonymous ID with IdentityManager
            const rudderstackAnonymousId = this.instance?.getAnonymousId()
            if (rudderstackAnonymousId) {
                this.identityManager.setAnonymousId(rudderstackAnonymousId)
            }

            // Call the ready callback
            onReady()
        })

        return this.instance
    }

    /**
     * Check if RudderStack has been initialized
     */
    get hasInitialized(): boolean {
        return this.instance?.has_initialized || false
    }

    /**
     * Check if user has been identified
     */
    get hasIdentified(): boolean {
        return this.instance?.has_identified || false
    }

    /**
     * Get the RudderStack instance (for direct access if needed)
     */
    getInstance(): RudderStack | null {
        return this.instance
    }

    /**
     * Get user ID from RudderStack
     */
    getUserId(): string {
        return this.instance?.getUserId() || ''
    }

    /**
     * Get anonymous ID from RudderStack
     */
    getAnonymousId(): string {
        return this.instance?.getAnonymousId() || ''
    }
}
