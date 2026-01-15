import type { Growthbook, GrowthbookConfigs } from '../integrations/Growthbook'
import type { TGrowthbookOptions, TGrowthbookAttributes } from '../types/types'
import type { IdentityManager } from '../core/IdentityManager'

/**
 * Wrapper for Growthbook A/B testing provider.
 * Handles dynamic import, initialization, and feature flag management.
 */
export class GrowthbookProvider {
    private instance: Growthbook | null = null
    private identityManager: IdentityManager

    constructor(identityManager: IdentityManager) {
        this.identityManager = identityManager
    }

    /**
     * Dynamically imports and initializes Growthbook.
     * Only loads Growthbook code when this method is called.
     *
     * @param growthbookKey - The Growthbook API key
     * @param decryptionKey - Optional decryption key for encrypted features
     * @param options - Growthbook initialization options
     * @returns The initialized Growthbook instance
     */
    async initialize(growthbookKey: string, decryptionKey?: string, options?: TGrowthbookOptions): Promise<Growthbook> {
        // 🎯 DYNAMIC IMPORT - Growthbook code only loads here
        const { Growthbook } = await import('../integrations/Growthbook')

        this.instance = Growthbook.getGrowthBookInstance(growthbookKey, decryptionKey, options)

        return this.instance
    }

    /**
     * Update Growthbook attributes (for targeting/segmentation)
     */
    setAttributes(attributes: TGrowthbookAttributes): void {
        this.instance?.setAttributes(attributes)
    }

    /**
     * Get the state of a feature flag experiment
     */
    getFeatureState(id: string): string | undefined {
        return this.instance?.getFeatureState(id)?.experimentResult?.name
    }

    /**
     * Get the value of a feature flag
     */
    getFeatureValue<K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(id: K, defaultValue: V): V {
        return (this.instance?.getFeatureValue(id as string, defaultValue) as V) ?? defaultValue
    }

    /**
     * Get Growthbook initialization status
     */
    async getStatus(): Promise<any> {
        return await this.instance?.getStatus()
    }

    /**
     * Check if a feature flag is enabled
     */
    isOn(key: string): boolean {
        return this.instance?.isOn(key) || false
    }

    /**
     * Update the URL for Growthbook (affects URL-based targeting)
     */
    setUrl(href: string): void {
        this.instance?.setUrl(href)
    }

    /**
     * Get the Growthbook instance (for direct access if needed)
     */
    getInstance(): Growthbook | null {
        return this.instance
    }
}
