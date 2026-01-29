import posthog, { PostHog } from 'posthog-js'
import Cookies from 'js-cookie'
import type { TPosthogOptions, TPosthogAttributes, TPosthogEvent } from './types'
import { posthogApiHost, posthogUiHost, posthogAllowedDomains } from '../../utils/urls'

export class Posthog {
    private static instance: Posthog
    private posthog_instance: PostHog | null = null
    private is_initialized = false
    private is_identified = false
    private allowed_domains: string[]
    private api_key: string

    private constructor(options: TPosthogOptions) {
        if (!options.apiKey) {
            throw new Error('Posthog: API key is required. Please provide apiKey in options.')
        }

        this.api_key = options.apiKey
        this.allowed_domains = options.allowedDomains || posthogAllowedDomains
    }

    public static getPosthogInstance(options: TPosthogOptions): Posthog {
        if (!Posthog.instance) {
            Posthog.instance = new Posthog(options)
        }
        return Posthog.instance
    }

    private isAllowedDomain(): boolean {
        if (typeof window === 'undefined') return false

        const currentHost = window.location.host
        return this.allowed_domains.some(domain => currentHost.endsWith(`.${domain}`) || currentHost === domain)
    }

    private checkExistingIdentification(): boolean {
        if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false

        try {
            const existingData = localStorage.getItem(`ph_${this.api_key}_posthog`)
            if (existingData) {
                const parsed = JSON.parse(existingData)
                return !!(parsed.distinct_id && parsed.$device_id && parsed.distinct_id !== parsed.$device_id)
            }
        } catch (e) {
            console.warn('Posthog: Failed to check existing identification', e)
        }
        return false
    }

    private shouldBootstrapWithRudderstack(): boolean {
        if (typeof window === 'undefined') return false

        const isIdentified = this.checkExistingIdentification()
        const existingData =
            typeof localStorage !== 'undefined' ? localStorage.getItem(`ph_${this.api_key}_posthog`) : null
        const rudderAnonId = Cookies.get('rudder_anonymous_id')

        return !isIdentified && !existingData && !!rudderAnonId
    }

    public init(options: Partial<TPosthogOptions> = {}): void {
        if (this.is_initialized || typeof window === 'undefined') return

        const apiHost = options.apiHost || posthogApiHost
        const uiHost = options.uiHost || posthogUiHost
        const enableSessionRecording = options.enableSessionRecording ?? true
        const enableAutocapture = options.enableAutocapture ?? true
        const debug = options.debug ?? false

        const rudderAnonId = Cookies.get('rudder_anonymous_id')
        const shouldBootstrap = this.shouldBootstrapWithRudderstack()

        const config = {
            api_host: apiHost,
            ui_host: uiHost,
            ...(shouldBootstrap ? { bootstrap: { distinctID: rudderAnonId } } : {}),
            before_send: (event: any) => {
                return this.isAllowedDomain() ? event : null
            },
            ...(enableSessionRecording && {
                session_recording: {
                    recordCrossOriginIframes: true,
                },
            }),
            autocapture: enableAutocapture,
            debug,
            ...options.customConfig,
        }

        posthog.init(this.api_key, config)
        this.posthog_instance = posthog
        this.is_initialized = true
        this.is_identified = this.checkExistingIdentification()

        // Synchronize IDs between Posthog and Rudderstack
        if (!this.is_identified) {
            this.syncIdsWithRudderstack()
        }
    }

    private syncIdsWithRudderstack(): void {
        if (typeof window === 'undefined') return

        const MAX_ATTEMPTS = 10 // Reduced from 20
        const INITIAL_INTERVAL_MS = 100 // Start faster
        const MAX_INTERVAL_MS = 1000 // Cap at 1 second
        let attempts = 0
        let currentInterval = INITIAL_INTERVAL_MS
        let timeoutId: NodeJS.Timeout | null = null

        const clearSync = () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
                timeoutId = null
            }
        }

        const syncIds = () => {
            attempts++

            if (attempts >= MAX_ATTEMPTS) {
                clearSync()
                return
            }

            const rudderId = Cookies.get('rudder_anonymous_id')
            const posthogId = this.posthog_instance?.get_distinct_id?.()

            if (!posthogId || !rudderId) {
                // Exponential backoff: 100ms, 150ms, 225ms, 337ms, 505ms, 757ms, 1000ms (capped)
                currentInterval = Math.min(currentInterval * 1.5, MAX_INTERVAL_MS)
                timeoutId = setTimeout(syncIds, currentInterval)
                return
            }

            if (rudderId === posthogId) {
                clearSync()
                return
            }

            // Sync Posthog ID to Rudderstack
            if (typeof (window as any).rudderanalytics !== 'undefined') {
                ;(window as any).rudderanalytics?.setAnonymousId?.(posthogId)
            }

            // Update Rudderstack cookie with Posthog ID
            Cookies.set('rudder_anonymous_id', posthogId, {
                domain: `.${window.location.hostname.split('.').slice(-2).join('.')}`,
                path: '/',
                expires: 365,
            })

            clearSync()
        }

        // Start first attempt after 500ms
        timeoutId = setTimeout(syncIds, 500)
    }

    public identify(userId: string, attributes?: TPosthogAttributes): void {
        if (!this.is_initialized || !this.posthog_instance || typeof window === 'undefined') {
            console.warn('Posthog: Cannot identify - not initialized')
            return
        }

        if (!this.posthog_instance._isIdentified()) {
            const anonId = this.posthog_instance.get_distinct_id()
            this.posthog_instance.alias(userId, anonId)

            const identifyProps = {
                ...(attributes?.user_language && { language: attributes.user_language }),
                ...(attributes?.country && { country_of_residence: attributes.country }),
                ...(attributes?.account_type && { account_type: attributes.account_type }),
            }

            this.posthog_instance.identify(userId, identifyProps)
            this.is_identified = true
        }
    }

    public reset(): void {
        if (!this.is_initialized || !this.posthog_instance) return

        this.posthog_instance.reset()
        this.is_identified = false
    }

    /**
     * Flattens nested objects by merging special keys to the top level.
     * Unlike traditional flattening, this does NOT add parent key prefixes.
     *
     * Special keys that are flattened (merged to top level):
     * - `cta_information` - All properties lifted to top level
     * - `event_metadata` - All properties lifted to top level
     * - `error` - All properties lifted to top level
     *
     * All other nested objects are preserved as-is.
     * Arrays are always preserved.
     *
     * @example
     * Input:  { action: "click", cta_information: { cta_name: "signup" } }
     * Output: { action: "click", cta_name: "signup" }
     */
    private flattenObject(obj: Record<string, any>, result: Record<string, any> = {}): Record<string, any> {
        // Special keys that should be flattened (merged to top level)
        const specialKeys = ['cta_information', 'event_metadata', 'error']

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key]

                // Skip null/undefined values
                if (value === null || value === undefined) {
                    continue
                }

                // Handle nested objects
                if (typeof value === 'object' && !Array.isArray(value)) {
                    // Special keys: merge all fields to top level
                    if (specialKeys.includes(key)) {
                        for (const nestedKey in value) {
                            if (value.hasOwnProperty(nestedKey)) {
                                const nestedValue = value[nestedKey]
                                // Only add non-null/non-undefined values
                                if (nestedValue !== null && nestedValue !== undefined) {
                                    result[nestedKey] = nestedValue
                                }
                            }
                        }
                    }
                    // For other nested objects, keep them as-is (don't flatten)
                    else {
                        result[key] = value
                    }
                } else {
                    // Primitive values and arrays - keep as-is
                    result[key] = value
                }
            }
        }
        return result
    }

    private cleanObject(obj: Record<string, any>): Record<string, any> {
        const cleaned: Record<string, any> = {}
        for (const key in obj) {
            if (obj[key] !== null && obj[key] !== undefined && obj[key] !== '') {
                cleaned[key] = obj[key]
            }
        }
        return cleaned
    }

    public capture(eventName: string, properties?: TPosthogEvent): void {
        if (!this.is_initialized || !this.posthog_instance) {
            console.warn('Posthog: Cannot capture event - not initialized')
            return
        }

        if (!this.isAllowedDomain()) {
            return
        }

        // Flatten nested properties
        const flattenedProperties = properties ? this.flattenObject(properties) : {}

        // Clean the object to remove null/undefined/empty values
        const cleanedProperties = this.cleanObject(flattenedProperties)

        this.posthog_instance.capture(eventName, cleanedProperties)
    }

    public getDistinctId(): string | undefined {
        return this.posthog_instance?.get_distinct_id?.()
    }

    public isLoaded(): boolean {
        return this.is_initialized && this.posthog_instance?.__loaded === true
    }

    public isIdentified(): boolean {
        return this.is_identified
    }

    public getInstance(): PostHog | null {
        return this.posthog_instance
    }

    public updateConfig(options: Partial<Omit<TPosthogOptions, 'apiKey'>>): void {
        if (options.allowedDomains) {
            this.allowed_domains = options.allowedDomains
        }

        if (this.posthog_instance && this.is_initialized) {
            if (options.customConfig) {
                Object.assign(this.posthog_instance.config, options.customConfig)
            }
        }
    }
}
