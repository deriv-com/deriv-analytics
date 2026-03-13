export const CACHE_STORAGE_EVENTS = 'cached_analytics_events'
export const CACHE_STORAGE_PAGES = 'cached_analytics_page_views'

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

export const cacheEventToStorage = (eventName: string, properties: Record<string, unknown>): void => {
    try {
        const existingCache = localStorage.getItem(CACHE_STORAGE_EVENTS)
        const events: CachedEvent[] = existingCache ? JSON.parse(existingCache) : []
        events.push({ name: eventName, properties, timestamp: Date.now() })
        localStorage.setItem(CACHE_STORAGE_EVENTS, JSON.stringify(events))
    } catch (err) {
        console.warn('Analytics: Failed to cache event', err)
    }
}

export const cachePageViewToStorage = (pageName: string, properties?: Record<string, unknown>): void => {
    try {
        const existingCache = localStorage.getItem(CACHE_STORAGE_PAGES)
        const pages: CachedPageView[] = existingCache ? JSON.parse(existingCache) : []
        pages.push({ name: pageName, properties, timestamp: Date.now() })
        localStorage.setItem(CACHE_STORAGE_PAGES, JSON.stringify(pages))
    } catch (err) {
        console.warn('Analytics: Failed to cache page view', err)
    }
}

export const getCachedEvents = (): CachedEvent[] => {
    try {
        const storedEventsString = localStorage.getItem(CACHE_STORAGE_EVENTS)
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
        const storedPagesString = localStorage.getItem(CACHE_STORAGE_PAGES)
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
    try {
        localStorage.removeItem(CACHE_STORAGE_EVENTS)
    } catch (err) {
        console.warn('Analytics: Failed to clear cached events', err)
    }
}

export const clearCachedPageViews = (): void => {
    try {
        localStorage.removeItem(CACHE_STORAGE_PAGES)
    } catch (err) {
        console.warn('Analytics: Failed to clear cached page views', err)
    }
}
