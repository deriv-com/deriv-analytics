import { RudderAnalytics } from '@rudderstack/analytics-js'
import type { TCoreAttributes, TAllEvents } from '../../analytics/types'

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

    public static getRudderStackInstance = (RUDDERSTACK_KEY: string, onLoaded?: () => void) => {
        if (!RudderStack._instance) {
            RudderStack._instance = new RudderStack(RUDDERSTACK_KEY, onLoaded)
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
            const external_domains = ['webflow.io']
            const is_external_domain = external_domains.some(domain => hostname.endsWith(domain))
            const domain_name = is_external_domain ? hostname : hostname.split('.').slice(-2).join('.')

            document.cookie = `${this.rudderstack_anonymous_cookie_key}=${crypto.randomUUID()}; path=/; Domain=${domain_name}; max-age=${2 * 365 * 24 * 60 * 60}`
        }
    }

    getUserId = () => this.analytics.getUserId()

    init = (RUDDERSTACK_KEY: string) => {
        if (!RUDDERSTACK_KEY) return

        this.setCookieIfNotExists()

        this.analytics.load(RUDDERSTACK_KEY, 'https://deriv-dataplane.rudderstack.com', {
            externalAnonymousIdCookieName: this.rudderstack_anonymous_cookie_key,
            // Performance optimizations
            useBeacon: true,
            flushAt: 10,
            flushInterval: 10000,
            lockIntegrationsVersion: true,
            retryQueue: true,
            onLoaded: () => {
                this.has_initialized = true
                this.has_identified = !!this.getUserId()
                this.onLoadedCallback?.()
            },
        } as any)
    }

    identifyEvent = (user_id: string, payload: { language: string }) => {
        const currentUserId = this.getUserId()
        if (!currentUserId) {
            this.analytics.identify(user_id, payload)
        }
        this.has_identified = true
    }

    pageView = (
        current_page: string,
        platform = 'Deriv App',
        user_id: string,
        properties?: Record<string, unknown>
    ) => {
        if (!this.has_initialized || current_page === this.current_page) return

        const pageProperties = {
            ...(user_id && { user_id }),
            ...properties,
        }

        this.analytics.page(platform, current_page, pageProperties as any)
        this.current_page = current_page
    }

    reset = () => {
        if (!this.has_initialized) return
        this.analytics.reset()
        this.has_identified = false
    }

    track = <T extends keyof TAllEvents>(event: T, payload: TAllEvents[T] & Partial<TCoreAttributes>) => {
        if (!this.has_initialized) return

        try {
            const clean_payload = Object.fromEntries(
                Object.entries(payload).filter(([_, value]) => value !== undefined)
            )
            this.analytics.track(event, clean_payload as any)
        } catch (err) {
            console.warn('RudderStack: Failed to track event', err)
        }
    }
}
