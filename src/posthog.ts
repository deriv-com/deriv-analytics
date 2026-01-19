import posthog from 'posthog-js'
import type { PostHogConfig as PostHogInitConfig } from 'posthog-js'
import { TCoreAttributes, TAllEvents } from './types'
import { v6 as uuidv6 } from 'uuid'

export type PostHogConfig = Omit<Partial<PostHogInitConfig>, 'api_host' | 'ui_host' | 'bootstrap' | 'loaded'> & {
    capture_pageview?: boolean
    capture_pageleave?: boolean
    autocapture?: boolean
}

export class PostHogAnalytics {
    has_identified = false
    has_initialized = false
    current_page = ''
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
            const external_domains = ['webflow.io']
            const is_external_domain = external_domains.some(domain => hostname.endsWith(domain))
            const domain_name = is_external_domain ? hostname : hostname.split('.').slice(-2).join('.')

            document.cookie = `${this.rudderstack_anonymous_cookie_key}=${uuidv6()}; path=/; Domain=${domain_name}; max-age=${2 * 365 * 24 * 60 * 60}`
        }
    }

    getUserId = () => posthog.get_distinct_id()

    private transformToPostHogPayload = (payload: any): any => {
        const transformed: any = {}

        const flatten = (obj: any) => {
            if (obj === null || obj === undefined) return

            Object.keys(obj).forEach(key => {
                const value = obj[key]

                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    flatten(value)
                } else if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
                    try {
                        const parsed = JSON.parse(value)
                        flatten(parsed)
                    } catch {
                        transformed[key] = value
                    }
                } else {
                    transformed[key] = value
                }
            })
        }

        flatten(payload)
        return Object.fromEntries(Object.entries(transformed).filter(([_, value]) => value !== undefined))
    }

    init = (POSTHOG_KEY: string, POSTHOG_HOST?: string, disableAMD: boolean = false, config?: PostHogConfig) => {
        if (!POSTHOG_KEY) return

        let _define: any
        if (disableAMD) {
            _define = window.define
            window.define = undefined
        }

        this.setCookieIfNotExists()
        const anonymous_id = this.getAnonymousId()

        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST || 'https://ph.deriv.com',
            ui_host: 'https://us.posthog.com',
            bootstrap: { distinctID: anonymous_id },
            autocapture: true,
            ...config,
            loaded: () => {
                if (disableAMD) {
                    window.define = _define
                }
                this.has_initialized = true
                this.has_identified = posthog.get_distinct_id() !== anonymous_id
                this.onLoadedCallback?.()
            },
        })
    }

    identifyEvent = (user_id: string, payload: { language: string }) => {
        const currentUserId = this.getUserId()
        const anonymousId = this.getAnonymousId()

        if (!currentUserId || currentUserId === anonymousId) {
            if (anonymousId && currentUserId === anonymousId) {
                posthog.alias(user_id, anonymousId)
            }
            posthog.identify(user_id, payload)
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

        const pageProperties = user_id ? { user_id, platform, ...properties } : { platform, ...properties }

        posthog.capture('$pageview', {
            $current_url: window.location.href,
            page_name: current_page,
            ...pageProperties,
        })

        this.current_page = current_page
    }

    reset = () => {
        if (!this.has_initialized) return
        posthog.reset()
        this.has_identified = false
    }

    track = <T extends keyof TAllEvents>(event: T, payload: TAllEvents[T] & Partial<TCoreAttributes>) => {
        if (!this.has_initialized) return

        try {
            const transformedPayload = this.transformToPostHogPayload(payload)
            const clean_payload = Object.fromEntries(
                Object.entries(transformedPayload).filter(([_, value]) => value !== undefined)
            )
            posthog.capture(event as string, clean_payload as any)
        } catch (err) {
            console.error(err)
        }
    }
}
