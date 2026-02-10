import { RudderAnalytics } from '@rudderstack/analytics-js'
import type { TCoreAttributes, TAllEvents } from '../analytics/types'
import { rudderstackDataplane } from '../utils/urls'

// Constants
const COOKIE_MAX_AGE_SECONDS = 2 * 365 * 24 * 60 * 60 // 2 years

/**
 * RudderStack analytics wrapper with singleton pattern.
 * Handles user tracking, page views, and event analytics.
 */
export class RudderStack {
    analytics = new RudderAnalytics()
    has_identified = false
    has_initialized = false
    current_page = ''
    rudderstack_anonymous_cookie_key = 'rudder_anonymous_id'
    private static _instance: RudderStack
    private onLoadedCallback?: () => void

    constructor(RUDDERSTACK_KEY: string, onLoaded?: () => void) {
        this.onLoadedCallback = onLoaded
        this.init(RUDDERSTACK_KEY)
    }

    /**
     * Get or create the singleton instance of RudderStack
     * @param RUDDERSTACK_KEY - RudderStack write key
     * @param onLoaded - Optional callback when RudderStack is loaded
     * @returns The RudderStack singleton instance
     */
    public static getRudderStackInstance = (RUDDERSTACK_KEY: string, onLoaded?: () => void): RudderStack => {
        if (!RudderStack._instance) {
            RudderStack._instance = new RudderStack(RUDDERSTACK_KEY, onLoaded)
        }
        return RudderStack._instance
    }

    /**
     * Get the anonymous ID from cookies
     * @returns The anonymous ID or undefined if not found
     */
    getAnonymousId = (): string | undefined => {
        return document.cookie.match('(^|;)\\s*' + this.rudderstack_anonymous_cookie_key + '\\s*=\\s*([^;]+)')?.pop()
    }

    /**
     * Set anonymous ID cookie if it doesn't exist
     * Creates a secure cookie with proper domain and security attributes
     */
    setCookieIfNotExists = (): void => {
        const anonymous_id = this.getAnonymousId()

        if (!anonymous_id) {
            try {
                const hostname = window.location.hostname
                const external_domains = ['webflow.io']
                const is_external_domain = external_domains.some(domain => hostname.endsWith(domain))
                const domain_name = is_external_domain ? hostname : hostname.split('.').slice(-2).join('.')

                // Check if crypto.randomUUID is available
                const uuid = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`

                const isSecure = window.location.protocol === 'https:'
                const secureFlag = isSecure ? '; Secure' : ''

                document.cookie = `${this.rudderstack_anonymous_cookie_key}=${uuid}; path=/; Domain=${domain_name}; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secureFlag}`
            } catch (error) {
                console.warn('RudderStack: Failed to set anonymous ID cookie', error)
            }
        }
    }

    /**
     * Get the current user ID
     * @returns The user ID, null, or undefined if not identified
     */
    getUserId = () => this.analytics.getUserId()

    /**
     * Initialize RudderStack with the provided key
     * @param RUDDERSTACK_KEY - RudderStack write key
     */
    init = (RUDDERSTACK_KEY: string): void => {
        if (!RUDDERSTACK_KEY) {
            console.warn('RudderStack: Initialization skipped - no key provided')
            return
        }

        try {
            this.setCookieIfNotExists()

            this.analytics.load(RUDDERSTACK_KEY, rudderstackDataplane, {
                externalAnonymousIdCookieName: this.rudderstack_anonymous_cookie_key,
                // Performance optimizations
                useBeacon: true,
                lockIntegrationsVersion: true,
                onLoaded: () => {
                    this.has_initialized = true
                    this.has_identified = !!this.getUserId()
                    this.onLoadedCallback?.()
                },
            })
        } catch (error) {
            console.error('RudderStack: Failed to initialize', error)
        }
    }

    /**
     * Identify a user with RudderStack
     * Only identifies if user hasn't been identified yet
     * @param user_id - The user ID to identify
     * @param payload - Additional user traits (e.g., language)
     */
    identifyEvent = (user_id: string, payload: { language: string }): void => {
        if (!this.has_initialized) {
            console.warn('RudderStack: Cannot identify - not initialized')
            return
        }

        const currentUserId = this.getUserId()
        if (!currentUserId) {
            try {
                this.analytics.identify(user_id, payload)
                this.has_identified = true
            } catch (error) {
                console.error('RudderStack: Failed to identify user', error)
            }
        } else {
            this.has_identified = true
        }
    }

    /**
     * Track a page view event
     * @param current_page - The page name/path
     * @param platform - The platform name (default: 'Deriv App')
     * @param user_id - The user ID
     * @param properties - Additional page properties
     */
    pageView = (
        current_page: string,
        platform = 'Deriv App',
        user_id: string,
        properties?: Record<string, unknown>
    ): void => {
        if (!this.has_initialized || current_page === this.current_page) return

        try {
            const pageProperties = {
                ...(user_id && { user_id }),
                ...properties,
            }

            // Type assertion needed due to RudderStack's type definitions
            this.analytics.page(platform, current_page, pageProperties as any)
            this.current_page = current_page
        } catch (error) {
            console.error('RudderStack: Failed to track page view', error)
        }
    }

    /**
     * Reset the RudderStack instance
     * Clears user identification and resets tracking state
     */
    reset = (): void => {
        if (!this.has_initialized) return

        try {
            this.analytics.reset()
            this.has_identified = false
        } catch (error) {
            console.error('RudderStack: Failed to reset', error)
        }
    }

    /**
     * Track a custom event with payload
     * Filters out undefined values before sending
     * @param event - The event name
     * @param payload - The event payload with core attributes
     */
    track = <T extends keyof TAllEvents>(event: T, payload: TAllEvents[T] & Partial<TCoreAttributes>): void => {
        if (!this.has_initialized) return

        try {
            // Remove undefined values from payload
            const clean_payload = Object.fromEntries(
                Object.entries(payload).filter(([_, value]) => value !== undefined)
            )

            // Type assertion needed to match RudderStack's ApiObject type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            this.analytics.track(event as string, clean_payload as any)
        } catch (err) {
            console.warn('RudderStack: Failed to track event', err)
        }
    }
}
