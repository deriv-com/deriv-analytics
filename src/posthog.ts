import posthog from 'posthog-js'
import type { PostHogConfig as PostHogInitConfig } from 'posthog-js'
import { TCoreAttributes, TAllEvents } from './types'
import { v6 as uuidv6 } from 'uuid'
import Cookies from 'js-cookie'

// Omit the configs we're already handling and create our custom type
export type PostHogConfig = Omit<Partial<PostHogInitConfig>, 'api_host' | 'ui_host' | 'bootstrap' | 'loaded'> & {
    // Our required/default configs can be optionally overridden
    capture_pageview?: boolean
    capture_pageleave?: boolean
    autocapture?: boolean
}

export class PostHogAnalytics {
    has_identified = false
    has_initialized = false
    current_page = ''
    // Share the same anonymous ID cookie with RudderStack
    rudderstack_anonymous_cookie_key = 'rudder_anonymous_id'
    private static _instance: PostHogAnalytics
    private onLoadedCallback?: () => void

    constructor(
        POSTHOG_KEY: string,
        POSTHOG_HOST?: string,
        disableAMD: boolean = false,
        onLoaded?: () => void,
        config?: PostHogConfig
    ) {
        this.onLoadedCallback = onLoaded
        this.init(POSTHOG_KEY, POSTHOG_HOST, disableAMD, config)
    }

    public static getPostHogInstance = (
        POSTHOG_KEY: string,
        POSTHOG_HOST?: string,
        disableAMD: boolean = false,
        onLoaded?: () => void,
        config?: PostHogConfig
    ) => {
        if (!PostHogAnalytics._instance) {
            PostHogAnalytics._instance = new PostHogAnalytics(POSTHOG_KEY, POSTHOG_HOST, disableAMD, onLoaded, config)
            return PostHogAnalytics._instance
        }
        return PostHogAnalytics._instance
    }

    getAnonymousId = () => {
        return document.cookie.match('(^|;)\\s*' + this.rudderstack_anonymous_cookie_key + '\\s*=\\s*([^;]+)')?.pop()
    }

    setCookieIfNotExists = () => {
        const anonymous_id = this.getAnonymousId()

        if (!anonymous_id) {
            const hostname = window.location.hostname

            // List of external domains where we should use the full hostname
            const external_domains = ['webflow.io']

            // Check if the hostname ends with any of the external domains
            const is_external_domain = external_domains.some(domain => hostname.endsWith(domain))

            // If it's an external domain, use the full hostname, otherwise use the last two parts
            const domain_name = is_external_domain ? hostname : hostname.split('.').slice(-2).join('.')

            // Set cookie to expire in 2 years
            document.cookie = `${
                this.rudderstack_anonymous_cookie_key
            }=${uuidv6()}; path=/; Domain=${domain_name}; max-age=${2 * 365 * 24 * 60 * 60}`
        }
    }

    /**
     * @returns The user ID that was assigned to the user after calling identify event
     */
    getUserId = () => posthog.get_distinct_id()

    /** For caching mechanism, PostHog SDK, first page load */
    handleCachedEvents = () => {
        const allowedDomains = ['deriv.com', 'deriv.team', 'deriv.ae']
        const domain = allowedDomains.some(d => window.location.hostname.includes(d))
            ? `.${allowedDomains.find(d => window.location.hostname.includes(d))}`
            : `.${allowedDomains[0]}`
        const storedEventsString: string | undefined = Cookies.get('cached_analytics_events')
        const storedPagesString: string | undefined = Cookies.get('cached_analytics_page_views')

        try {
            // Handle cached analytics events
            if (storedEventsString) {
                const storedEvents = JSON.parse(storedEventsString)

                if (Array.isArray(storedEvents) && storedEvents.length > 0) {
                    storedEvents.forEach((event: any) => {
                        posthog.capture(event.name, event.properties)
                    })

                    // Clear the stored events cookie
                    Cookies.remove('cached_analytics_events', { domain })
                }
            }

            // Handle cached page views
            if (storedPagesString) {
                const storedPages = JSON.parse(storedPagesString)

                if (Array.isArray(storedPages) && storedPages.length > 0) {
                    storedPages.forEach((page: any) => {
                        posthog.capture('$pageview', {
                            $current_url: window.location.href,
                            page_name: page?.name,
                            ...page?.properties,
                        })
                    })

                    // Clear the stored page views cookie
                    Cookies.remove('cached_analytics_page_views', { domain })
                }
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log(error)
        }
    }

    /**
     * Transform V2 event payload to PostHog flat structure
     */
    private transformToPostHogPayload = (payload: any): any => {
        const transformed: any = {}

        // Flatten event_metadata
        if (payload.event_metadata) {
            Object.keys(payload.event_metadata).forEach(key => {
                transformed[key] = payload.event_metadata[key]
            })
        }

        // Flatten cta_information
        if (payload.cta_information) {
            Object.keys(payload.cta_information).forEach(key => {
                transformed[key] = payload.cta_information[key]
            })
        }

        // Flatten error
        if (payload.error) {
            Object.keys(payload.error).forEach(key => {
                transformed[key] = payload.error[key]
            })
        }

        // Add top-level properties (excluding nested objects)
        Object.keys(payload).forEach(key => {
            if (!['event_metadata', 'cta_information', 'error'].includes(key)) {
                transformed[key] = payload[key]
            }
        })

        return transformed
    }

    /**
     * Initializes the PostHog SDK using proxy endpoint.
     * For local/staging environment, ensure that `POSTHOG_STAGING_KEY` is set.
     * For production environment, ensure that `POSTHOG_PRODUCTION_KEY` is set.
     *
     * Proxy Setup:
     * - Using https://ph.deriv.com as proxy endpoint (same for staging and production)
     * - Proxy forwards requests to PostHog Cloud
     * - X-headers are configured on the proxy server (not client-side)
     * - See: https://posthog.com/docs/advanced/proxy
     */
    init = (POSTHOG_KEY: string, POSTHOG_HOST?: string, disableAMD: boolean = false, config?: PostHogConfig) => {
        if (POSTHOG_KEY) {
            let _define: any
            if (disableAMD) {
                _define = window.define
                window.define = undefined
            }

            this.setCookieIfNotExists()

            // Get the shared anonymous ID from cookie
            const anonymous_id = this.getAnonymousId()

            posthog.init(POSTHOG_KEY, {
                // Use proxy endpoint for both staging and production
                // Default to https://ph.deriv.com, can be overridden via POSTHOG_HOST parameter
                api_host: POSTHOG_HOST || 'https://ph.deriv.com',

                // UI host should point to PostHog Cloud for dashboard links
                ui_host: 'https://us.posthog.com',

                // Use the same anonymous ID as RudderStack
                bootstrap: {
                    distinctID: anonymous_id,
                },

                // Default configurations
                capture_pageview: false,
                capture_pageleave: false,
                autocapture: true,

                // Override with consumer's config (this will override any of the above defaults)
                ...config,

                loaded: ph => {
                    if (disableAMD) {
                        window.define = _define
                    }
                    this.has_initialized = true
                    // Check if user is already identified
                    this.has_identified = posthog.get_distinct_id() !== anonymous_id
                    this.handleCachedEvents()

                    this.onLoadedCallback?.()
                },
            })
        }
    }

    /**
     *
     * @param user_id The user ID of the user to identify and associate all events with that particular user ID
     * @param payload Additional information passed to identify the user
     */
    identifyEvent = (user_id: string, payload: { language: string }) => {
        const currentUserId = this.getUserId()
        const anonymousId = this.getAnonymousId()

        // Only identify if not already identified or if it's still using anonymous ID
        if (!currentUserId || currentUserId === anonymousId) {
            posthog.identify(user_id, payload)
        }
        this.has_identified = true
    }

    /**
     * Pushes page view event to PostHog
     *
     * @param current_page The name or URL of the current page to track the page view event
     */
    pageView = (current_page: string, platform = 'Deriv App', user_id: string, properties?: {}) => {
        if (this.has_initialized && current_page !== this.current_page) {
            const pageProperties = user_id ? { user_id, platform, ...properties } : { platform, ...properties }

            posthog.capture('$pageview', {
                $current_url: window.location.href,
                page_name: current_page,
                ...pageProperties,
            })

            this.current_page = current_page
        }
    }

    /**
     * Pushes reset event to PostHog
     */
    reset = () => {
        if (this.has_initialized) {
            posthog.reset()
            this.has_identified = false
        }
    }

    /**
     * Pushes track events to PostHog with automatic payload transformation
     */
    track = <T extends keyof TAllEvents>(event: T, payload: TAllEvents[T] & Partial<TCoreAttributes>) => {
        if (this.has_initialized) {
            try {
                // Transform payload to flat structure for PostHog
                const transformedPayload = this.transformToPostHogPayload(payload)

                // Clean undefined values
                const clean_payload = Object.fromEntries(
                    Object.entries(transformedPayload).filter(([_, value]) => value !== undefined)
                )

                posthog.capture(event as string, clean_payload as any)
            } catch (err) {
                console.error(err)
            }
        }
    }
}
