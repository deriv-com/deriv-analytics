import Cookies from 'js-cookie'
import { getAllowedDomain } from './urls'

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
        const domain = getAllowedDomain()
        const existingCache = Cookies.get(CACHE_COOKIE_EVENTS)
        const events: CachedEvent[] = existingCache ? JSON.parse(existingCache) : []
        events.push({ name: eventName, properties, timestamp: Date.now() })
        const cookieOptions: Cookies.CookieAttributes = { expires: 1 }
        if (domain) cookieOptions.domain = domain
        Cookies.set(CACHE_COOKIE_EVENTS, JSON.stringify(events), cookieOptions)
    } catch (err) {
        console.warn('Analytics: Failed to cache event', err)
    }
}

export const cachePageViewToCookie = (pageName: string, properties?: Record<string, unknown>): void => {
    try {
        const domain = getAllowedDomain()
        const existingCache = Cookies.get(CACHE_COOKIE_PAGES)
        const pages: CachedPageView[] = existingCache ? JSON.parse(existingCache) : []
        pages.push({ name: pageName, properties, timestamp: Date.now() })
        const cookieOptions: Cookies.CookieAttributes = { expires: 1 }
        if (domain) cookieOptions.domain = domain
        Cookies.set(CACHE_COOKIE_PAGES, JSON.stringify(pages), cookieOptions)
    } catch (err) {
        console.warn('Analytics: Failed to cache page view', err)
    }
}

export const getCachedEvents = (): CachedEvent[] => {
    try {
        const storedEventsString = Cookies.get(CACHE_COOKIE_EVENTS)
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
        const storedPagesString = Cookies.get(CACHE_COOKIE_PAGES)
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
    const domain = getAllowedDomain()
    const cookieOptions = domain ? { domain } : {}
    Cookies.remove(CACHE_COOKIE_EVENTS, cookieOptions)
}

export const clearCachedPageViews = (): void => {
    const domain = getAllowedDomain()
    const cookieOptions = domain ? { domain } : {}
    Cookies.remove(CACHE_COOKIE_PAGES, cookieOptions)
}
