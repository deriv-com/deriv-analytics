import { RudderAnalytics } from '@rudderstack/analytics-js'
import { TCoreAttributes, TEvents } from './types'
import { v6 as uuidv6 } from 'uuid'

export class RudderStack {
    analytics = new RudderAnalytics()
    has_identified = false
    has_initialized = false
    current_page = ''
    rudderstack_anonymous_cookie_key = 'rudder_anonymous_id'
    private static _instance: RudderStack

    constructor(RUDDERSTACK_KEY: string) {
        this.init(RUDDERSTACK_KEY)
    }

    public static getRudderStackInstance = (RUDDERSTACK_KEY: string) => {
        if (!RudderStack._instance) {
            RudderStack._instance = new RudderStack(RUDDERSTACK_KEY)
            return RudderStack._instance
        }
        return RudderStack._instance
    }

    getAnonymousId = () => {
        return document.cookie.match('(^|;)\\s*' + this.rudderstack_anonymous_cookie_key + '\\s*=\\s*([^;]+)')?.pop()
    }

    setCookieIfNotExists = () => {
        // Check if the cookie already exists
        const anonymous_id = this.getAnonymousId()

        if (!anonymous_id) {
            const domain_name = window.location.hostname.split('.').slice(-2).join('.')
            // Add the new cookie with domain accessible to all subdomains
            document.cookie = `${this.rudderstack_anonymous_cookie_key}=${uuidv6()}; path=/; Domain=${domain_name}`
        }
    }

    /**
     * @returns The user ID that was assigned to the user after calling identify event
     */
    getUserId = () => this.analytics.getUserId()

    /**
     * Initializes the Rudderstack SDK. Ensure that the appropriate environment variables are set before this is called.
     * For local/staging environment, ensure that `RUDDERSTACK_STAGING_KEY` and `RUDDERSTACK_URL` is set.
     * For production environment, ensure that `RUDDERSTACK_PRODUCTION_KEY` and `RUDDERSTACK_URL` is set.
     */
    init = (RUDDERSTACK_KEY: string) => {
        if (RUDDERSTACK_KEY) {
            this.setCookieIfNotExists()
            this.analytics.load(RUDDERSTACK_KEY, 'https://deriv-dataplane.rudderstack.com', {
                externalAnonymousIdCookieName: this.rudderstack_anonymous_cookie_key,
            })
            this.analytics.ready(() => {
                this.has_initialized = true
                this.has_identified = !!(this.getUserId() || this.getAnonymousId())
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
    pageView = (current_page: string, platform = 'Deriv App', user_id: string) => {
        if (this.has_initialized && this.has_identified && current_page !== this.current_page) {
            this.analytics.page(platform, current_page, { user_id })
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
