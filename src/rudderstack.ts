import { RudderAnalytics } from '@rudderstack/analytics-js'
import { TCoreAttributes, TEvents } from './types'
import { v6 as uuidv6 } from 'uuid'
import Cookies from 'js-cookie'
export class RudderStack {
    analytics = new RudderAnalytics()
    has_identified = false
    has_initialized = false
    current_page = ''
    rudderstack_anonymous_cookie_key = 'rudder_anonymous_id'
    private static _instance: RudderStack

    constructor(RUDDERSTACK_KEY: string, disableAMD: boolean = false) {
        this.init(RUDDERSTACK_KEY, disableAMD)
    }

    public static getRudderStackInstance = (RUDDERSTACK_KEY: string, disableAMD: boolean = false) => {
        if (!RudderStack._instance) {
            RudderStack._instance = new RudderStack(RUDDERSTACK_KEY, disableAMD)
            return RudderStack._instance
        }
        return RudderStack._instance
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
    getUserId = () => this.analytics.getUserId()

    /** For caching mechanism, Rudderstack  SDK, first page load  */
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
                        this.analytics.track(event.name, event.properties)
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
                        this.analytics.page(page?.name, page?.properties)
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
     * Initializes the Rudderstack SDK. Ensure that the appropriate environment variables are set before this is called.
     * For local/staging environment, ensure that `RUDDERSTACK_STAGING_KEY` and `RUDDERSTACK_URL` is set.
     * For production environment, ensure that `RUDDERSTACK_PRODUCTION_KEY` and `RUDDERSTACK_URL` is set.
     */

    init = (RUDDERSTACK_KEY: string, disableAMD: boolean = false) => {
        if (RUDDERSTACK_KEY) {
            let _define: any
            if (disableAMD) {
                _define = window.define
                window.define = undefined
            }

            this.setCookieIfNotExists()
            this.analytics.load(RUDDERSTACK_KEY, 'https://deriv-dataplane.rudderstack.com', {
                externalAnonymousIdCookieName: this.rudderstack_anonymous_cookie_key,
            })
            this.analytics.ready(() => {
                if (disableAMD) {
                    window.define = _define
                }
                this.has_initialized = true
                this.has_identified = !!(this.getUserId() || this.getAnonymousId())
                this.handleCachedEvents()
            })
        }
    }

    /**
     *
     * @param user_id The user ID of the user to identify and associate all events with that particular user ID
     * @param payload Additional information passed to identify the user
     */
    identifyEvent = (user_id: string, payload: { language: string }) => {
        this.analytics.identify(user_id, payload)
        this.has_identified = true
    }

    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    pageView = (current_page: string, platform = 'Deriv App', user_id: string, properties?: {}) => {
        if (this.has_initialized && this.has_identified && current_page !== this.current_page) {
            // Only include user_id in properties if it's not empty
            const pageProperties = user_id ? { user_id, ...properties } : properties
            this.analytics.page(platform, current_page, pageProperties)
            this.current_page = current_page
        }
    }

    /**
     * Pushes reset event to rudderstack
     */
    reset = () => {
        if (this.has_initialized) {
            this.analytics.reset()
            this.has_identified = false
        }
    }

    /**
     * Pushes track events to Rudderstack. When this method is called before `identifyEvent` method is called, the events tracked will be associated with an anonymous ID.
     * Otherwise, if the events needs to be associated with a user ID, call `identifyEvent` with the user ID passed first before calling this method.
     *
     * @param event The event name to track
     * @param payload Additional information related to the event
     */
    track = <T extends keyof TEvents>(event: T, payload: TEvents[T] & Partial<TCoreAttributes>) => {
        const clean_payload = Object.fromEntries(Object.entries(payload).filter(([_, value]) => value !== undefined))
        if (this.has_initialized && this.has_identified) {
            try {
                this.analytics.track(event, clean_payload)
            } catch (err) {
                console.error(err)
            }
        }
    }
}
