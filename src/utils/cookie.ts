export const CACHE_COOKIE_EVENTS = 'cached_analytics_events'
export const CACHE_COOKIE_PAGES = 'cached_analytics_page_views'

export type CachedEvent = {
    name: string
    properties: Record<string, unknown>
    timestamp: number
}

export type CachedPageView = {
    name: string
    properties?: Record<string, unknown>
    timestamp: number
}

export const cacheEventToCookie = (eventName: string, properties: Record<string, unknown>): void => {
    try {
        const existingCache = localStorage.getItem(CACHE_COOKIE_EVENTS)
        const events: CachedEvent[] = existingCache ? JSON.parse(existingCache) : []
        events.push({ name: eventName, properties, timestamp: Date.now() })
        localStorage.setItem(CACHE_COOKIE_EVENTS, JSON.stringify(events))
    } catch (err) {
        console.warn('Analytics: Failed to cache event', err)
    }
}

export const cachePageViewToCookie = (pageName: string, properties?: Record<string, unknown>): void => {
    try {
        const existingCache = localStorage.getItem(CACHE_COOKIE_PAGES)
        const pages: CachedPageView[] = existingCache ? JSON.parse(existingCache) : []
        pages.push({ name: pageName, properties, timestamp: Date.now() })
        localStorage.setItem(CACHE_COOKIE_PAGES, JSON.stringify(pages))
    } catch (err) {
        console.warn('Analytics: Failed to cache page view', err)
    }
}

export const getCachedEvents = (): CachedEvent[] => {
    try {
        const storedEventsString = localStorage.getItem(CACHE_COOKIE_EVENTS)
        if (storedEventsString) {
            const events = JSON.parse(storedEventsString)
            return Array.isArray(events) ? events : []
        }
    } catch (err) {
        console.warn('Analytics: Failed to get cached events', err)
    }
    return []
}

export const getCachedPageViews = (): CachedPageView[] => {
    try {
        const storedPagesString = localStorage.getItem(CACHE_COOKIE_PAGES)
        if (storedPagesString) {
            const pages = JSON.parse(storedPagesString)
            return Array.isArray(pages) ? pages : []
        }
    } catch (err) {
        console.warn('Analytics: Failed to get cached pages', err)
    }
    return []
}

export const clearCachedEvents = (): void => {
    localStorage.removeItem(CACHE_COOKIE_EVENTS)
}

export const clearCachedPageViews = (): void => {
    localStorage.removeItem(CACHE_COOKIE_PAGES)
}
