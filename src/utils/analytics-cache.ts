type CachedEvent = {
    name: string
    properties: Record<string, any>
}

type ResponseData = {
    url: string
    method: string
    status: number
    headers: string
    data: string
    payload: any
}

type EventListenerConfig = {
    element: Element | NodeList | string
    event: {
        name: string
        properties: Record<string, any>
    }
    cache?: boolean
    callback?: (e: Event) => { name: string; properties: Record<string, any>; cache?: boolean }
}

type LoadEventConfig = {
    event: {
        name: string
        properties: Record<string, any>
    }
}

type PageLoadEventConfig = {
    pages?: string[]
    excludedPages?: string[]
    event: {
        name: string
        properties: Record<string, any>
    }
    callback?: () => { name: string; properties: Record<string, any> }
}

class AnalyticsCacheManager {
    private interval: NodeJS.Timeout | null = null
    private responses: ResponseData[] = []
    private isTrackingResponses = false

    /**
     * FNV-1a hash algorithm for creating consistent hashes
     */
    private hash(inputString: string, desiredLength = 32): string {
        const fnv1aHash = (string: string): string => {
            let hash = 0x811c9dc5
            for (let i = 0; i < string.length; i++) {
                hash ^= string.charCodeAt(i)
                hash = (hash * 0x01000193) >>> 0
            }
            return hash.toString(16)
        }

        const base64Encode = (string: string): string => btoa(string)

        let hash = fnv1aHash(inputString)
        let combined = base64Encode(hash)

        while (combined.length < desiredLength) {
            combined += base64Encode(fnv1aHash(combined))
        }

        return combined.substring(0, desiredLength)
    }

    /**
     * Get cookie value by name
     */
    getCookies(name: string): any {
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) {
            const cookieValue = decodeURIComponent(parts.pop()!.split(';').shift()!)

            try {
                return JSON.parse(cookieValue)
            } catch (e) {
                return cookieValue
            }
        }
        return null
    }

    /**
     * Track page unload events to cache pageviews before leaving
     */
    trackPageUnload(): void {
        if (typeof window === 'undefined') return

        window.addEventListener('beforeunload', () => {
            if (!this.isPageViewSent()) {
                this.push('cached_analytics_page_views', {
                    name: window.location.href,
                    properties: {
                        url: window.location.href,
                    },
                })
            }
        })
    }

    /**
     * Track XMLHttpRequest responses to monitor analytics calls
     */
    trackResponses(): void {
        if (typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined') return

        const originalXhrOpen = XMLHttpRequest.prototype.open
        const originalXhrSend = XMLHttpRequest.prototype.send

        XMLHttpRequest.prototype.open = function (method: string, url: string | URL) {
            ;(this as any)._url = url
            ;(this as any)._method = method
            return originalXhrOpen.apply(this, arguments as any)
        }

        XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
            this.addEventListener('load', function () {
                let parsedPayload = null

                if (typeof body === 'string') {
                    try {
                        parsedPayload = JSON.parse(body)
                    } catch (e) {
                        parsedPayload = body
                    }
                }

                const responseData: ResponseData = {
                    url: (this as any)._url,
                    method: (this as any)._method,
                    status: this.status,
                    headers: this.getAllResponseHeaders(),
                    data: this.responseText,
                    payload: parsedPayload,
                }
                cacheTrackEvents.responses.push(responseData)
            })

            return originalXhrSend.apply(this, arguments as any)
        }

        this.isTrackingResponses = true
    }

    /**
     * Check if Analytics instance is ready
     */
    isReady(): boolean {
        if (typeof window === 'undefined') return false

        const Analytics = (window as any).Analytics
        if (typeof Analytics === 'undefined' || Analytics === null) {
            return false
        }

        const instances = Analytics.Analytics?.getInstances?.()
        return !!instances?.tracking
    }

    /**
     * Parse cookies into an object
     */
    private parseCookies(cookieName: string): any {
        if (typeof document === 'undefined') return null

        const cookies = document.cookie.split('; ').reduce((acc: Record<string, string>, cookie) => {
            const [key, value] = cookie.split('=')
            if (key && value) {
                acc[decodeURIComponent(key)] = decodeURIComponent(value)
            }
            return acc
        }, {})

        try {
            return cookies[cookieName] ? JSON.parse(cookies[cookieName]) : null
        } catch (error) {
            return null
        }
    }

    /**
     * Check if pageview has been sent
     */
    isPageViewSent(): boolean {
        return !!this.responses.find(e => e.payload?.type === 'page' && e.payload?.anonymousId)
    }

    /**
     * Set a cached event
     */
    set(event: CachedEvent): void {
        this.push('cached_analytics_events', event)
    }

    /**
     * Push data to cookie cache
     */
    push(cookieName: string, data: any): void {
        if (typeof document === 'undefined') return

        let storedCookies: any[] = []
        const cacheCookie = this.parseCookies(cookieName)
        if (cacheCookie) storedCookies = cacheCookie

        storedCookies.push(data)

        const domain = this.getAllowedDomain()
        document.cookie = `${cookieName}=${JSON.stringify(storedCookies)}; path=/; Domain=${domain}; max-age=${
            365 * 24 * 60 * 60
        }`
    }

    /**
     * Get the allowed domain for cookies
     */
    private getAllowedDomain(): string {
        if (typeof window === 'undefined') return ''

        const hostname = window.location.hostname
        const parts = hostname.split('.')

        if (hostname === 'localhost' || parts.length === 1) {
            return hostname
        }

        return `.${parts.slice(-2).join('.')}`
    }

    /**
     * Process event to hash email and add client info
     */
    processEvent(event: CachedEvent): CachedEvent {
        const clientInfo = this.getCookies('client_information')

        if (clientInfo) {
            const { email = null } = clientInfo

            if (email) {
                event.properties.email_hash = this.hash(email)
            }
        }

        if (event?.properties?.email) {
            const email = event.properties.email
            delete event.properties.email
            event.properties.email_hash = this.hash(email)
        }

        return event
    }

    /**
     * Track an event (either immediately or cache it)
     */
    track(originalEvent: CachedEvent, cache = false): void {
        if (typeof window === 'undefined') return

        const event = this.processEvent(originalEvent)
        const Analytics = (window as any).Analytics

        if (this.isReady() && !cache) {
            Analytics.Analytics.trackEvent(event.name, event.properties)
        } else {
            this.set(event)
        }
    }

    /**
     * Track pageview with auto-retry until sent
     */
    pageView(): void {
        if (typeof window === 'undefined') return

        if (!this.isTrackingResponses) {
            this.trackResponses()
            this.trackPageUnload()
        }

        let pageViewInterval: NodeJS.Timeout | null = null

        pageViewInterval = setInterval(() => {
            const Analytics = (window as any).Analytics

            if (
                typeof Analytics !== 'undefined' &&
                typeof Analytics.Analytics?.pageView === 'function' &&
                this.isReady()
            ) {
                Analytics.Analytics.pageView(window.location.href, "Trader's hub")
            }

            if (this.isPageViewSent()) {
                if (pageViewInterval) clearInterval(pageViewInterval)
            }
        }, 1000)
    }

    /**
     * Add click event listener to element(s)
     */
    listen(
        element: Element | NodeList,
        { name = '', properties = {} }: { name: string; properties: Record<string, any> },
        cache = false,
        callback: ((e: Event) => { name: string; properties: Record<string, any>; cache?: boolean }) | null = null
    ): void {
        const addClickListener = (el: Element) => {
            if (!(el as any).dataset?.clickEventTracking) {
                el.addEventListener('click', (e: Event) => {
                    let event = {
                        name,
                        properties,
                        cache,
                    }

                    if (typeof callback === 'function') {
                        const callbackResult = callback(e)
                        event = {
                            ...callbackResult,
                            cache: callbackResult.cache ?? cache,
                        }
                    }

                    this.track(event, event.cache ?? false)
                })
                ;(el as any).dataset.clickEventTracking = 'true'
            }
        }

        const elements = element instanceof NodeList ? Array.from(element as NodeListOf<Element>) : [element]
        elements.forEach(addClickListener)
    }

    /**
     * Add event handlers to multiple elements with auto-retry
     */
    addEventHandler(items: EventListenerConfig[]): this {
        if (typeof window === 'undefined') return this

        this.interval = setInterval(() => {
            let allListenersApplied = true

            items.forEach(({ element, event = { name: '', properties: {} }, cache = false, callback = null }) => {
                const elem = element instanceof Element ? element : document.querySelectorAll(element as string)
                const elements = elem instanceof NodeList ? Array.from(elem) : [elem]

                if (!elements.length) {
                    allListenersApplied = false
                }

                elements.forEach(el => {
                    if (!(el as any).dataset?.clickEventTracking) {
                        this.listen(el, event, cache, callback)
                        allListenersApplied = false
                    }
                })
            })

            if (allListenersApplied) {
                if (this.interval) clearInterval(this.interval)
            }
        }, 1)

        return this
    }

    /**
     * Load events immediately
     */
    loadEvent(items: LoadEventConfig[]): this {
        items.forEach(({ event }) => {
            const { name, properties } = event
            this.track({
                name,
                properties,
            })
        })

        return this
    }

    /**
     * Load events on specific pages
     */
    pageLoadEvent(items: PageLoadEventConfig[]): this {
        if (typeof window === 'undefined') return this

        const pathname = window.location.pathname.slice(1)
        items.forEach(({ pages = [], excludedPages = [], event, callback = null }) => {
            let dispatch = false
            if (pages.length) {
                if (pages.includes(pathname)) {
                    dispatch = true
                }
            } else if (excludedPages.length) {
                if (!excludedPages.includes(pathname)) {
                    dispatch = true
                }
            } else {
                dispatch = true
            }

            if (dispatch) {
                const eventData = callback ? callback() : event
                this.loadEvent([{ event: eventData }])
            }
        })

        return this
    }

    /**
     * Clear the interval
     */
    clearInterval(): void {
        if (this.interval) {
            clearInterval(this.interval)
            this.interval = null
        }
    }
}

// Create singleton instance
export const cacheTrackEvents = new AnalyticsCacheManager()

// Export to global scope for backward compatibility
if (typeof window !== 'undefined') {
    ;(window as any).cacheTrackEvents = cacheTrackEvents
}
