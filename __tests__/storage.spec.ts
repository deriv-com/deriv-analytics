import { vi } from 'vitest'
import {
    cacheEventToStorage,
    cachePageViewToStorage,
    getCachedEvents,
    getCachedPageViews,
    clearCachedEvents,
    clearCachedPageViews,
    CACHE_STORAGE_EVENTS,
    CACHE_STORAGE_PAGES,
} from '../src/utils/storage'

describe('storage utilities', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('cacheEventToStorage', () => {
        test('should cache a new event to localStorage', () => {
            cacheEventToStorage('test_event', { action: 'click' })

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_EVENTS)!)
            expect(stored).toHaveLength(1)
            expect(stored[0].name).toBe('test_event')
            expect(stored[0].properties).toEqual({ action: 'click' })
            expect(typeof stored[0].timestamp).toBe('number')
        })

        test('should append event to existing cache', () => {
            const existingCache = [{ name: 'existing_event', properties: { foo: 'bar' }, timestamp: 123456789 }]
            localStorage.setItem(CACHE_STORAGE_EVENTS, JSON.stringify(existingCache))

            cacheEventToStorage('new_event', { action: 'submit' })

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_EVENTS)!)
            expect(stored).toHaveLength(2)
            expect(stored[0]).toEqual(existingCache[0])
            expect(stored[1].name).toBe('new_event')
            expect(stored[1].properties).toEqual({ action: 'submit' })
            expect(typeof stored[1].timestamp).toBe('number')
        })

        test('should handle empty properties', () => {
            cacheEventToStorage('test_event', {})

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_EVENTS)!)
            expect(stored[0].name).toBe('test_event')
            expect(stored[0].properties).toEqual({})
            expect(typeof stored[0].timestamp).toBe('number')
        })

        test('should handle complex properties', () => {
            const complexProps = {
                user_id: 'CR123',
                metadata: { page: 'home', section: 'hero' },
                tags: ['new', 'important'],
            }

            cacheEventToStorage('test_event', complexProps)

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_EVENTS)!)
            expect(stored[0].name).toBe('test_event')
            expect(stored[0].properties).toEqual(complexProps)
            expect(typeof stored[0].timestamp).toBe('number')
        })

        test('should handle errors gracefully', () => {
            vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            expect(() => cacheEventToStorage('test_event', { action: 'click' })).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to cache event', expect.any(Error))
        })
    })

    describe('cachePageViewToStorage', () => {
        test('should cache a new page view to localStorage', () => {
            cachePageViewToStorage('/home', { platform: 'Deriv App' })

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_PAGES)!)
            expect(stored).toHaveLength(1)
            expect(stored[0].name).toBe('/home')
            expect(stored[0].properties).toEqual({ platform: 'Deriv App' })
            expect(typeof stored[0].timestamp).toBe('number')
        })

        test('should append page view to existing cache', () => {
            const existingCache = [{ name: '/dashboard', properties: {}, timestamp: 123456789 }]
            localStorage.setItem(CACHE_STORAGE_PAGES, JSON.stringify(existingCache))

            cachePageViewToStorage('/settings')

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_PAGES)!)
            expect(stored).toHaveLength(2)
            expect(stored[0]).toEqual(existingCache[0])
            expect(stored[1].name).toBe('/settings')
            expect(stored[1].properties).toBeUndefined()
            expect(typeof stored[1].timestamp).toBe('number')
        })

        test('should cache page view without properties', () => {
            cachePageViewToStorage('/about')

            const stored = JSON.parse(localStorage.getItem(CACHE_STORAGE_PAGES)!)
            expect(stored[0].name).toBe('/about')
            expect(stored[0].properties).toBeUndefined()
            expect(typeof stored[0].timestamp).toBe('number')
        })

        test('should handle errors gracefully', () => {
            vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            expect(() => cachePageViewToStorage('/test')).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to cache page view', expect.any(Error))
        })
    })

    describe('getCachedEvents', () => {
        test('should return empty array when no events cached', () => {
            const events = getCachedEvents()
            expect(events).toEqual([])
        })

        test('should return cached events', () => {
            const cachedEvents = [
                { name: 'event1', properties: { foo: 'bar' }, timestamp: 123456789 },
                { name: 'event2', properties: { baz: 'qux' }, timestamp: 987654321 },
            ]
            localStorage.setItem(CACHE_STORAGE_EVENTS, JSON.stringify(cachedEvents))

            const events = getCachedEvents()
            expect(events).toEqual(cachedEvents)
        })

        test('should return empty array for invalid JSON', () => {
            localStorage.setItem(CACHE_STORAGE_EVENTS, 'invalid json')

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const events = getCachedEvents()

            expect(events).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached events', expect.any(Error))
        })

        test('should return empty array if cached value is not an array', () => {
            localStorage.setItem(CACHE_STORAGE_EVENTS, JSON.stringify({ not: 'an array' }))

            const events = getCachedEvents()
            expect(events).toEqual([])
        })

        test('should handle errors gracefully', () => {
            vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const events = getCachedEvents()

            expect(events).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached events', expect.any(Error))
        })
    })

    describe('getCachedPageViews', () => {
        test('should return empty array when no page views cached', () => {
            const pages = getCachedPageViews()
            expect(pages).toEqual([])
        })

        test('should return cached page views', () => {
            const cachedPages = [
                { name: '/home', properties: {}, timestamp: 123456789 },
                { name: '/dashboard', properties: { platform: 'Deriv' }, timestamp: 987654321 },
            ]
            localStorage.setItem(CACHE_STORAGE_PAGES, JSON.stringify(cachedPages))

            const pages = getCachedPageViews()
            expect(pages).toEqual(cachedPages)
        })

        test('should return empty array for invalid JSON', () => {
            localStorage.setItem(CACHE_STORAGE_PAGES, 'not valid json')

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const pages = getCachedPageViews()

            expect(pages).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached pages', expect.any(Error))
        })

        test('should return empty array if cached value is not an array', () => {
            localStorage.setItem(CACHE_STORAGE_PAGES, JSON.stringify('string'))

            const pages = getCachedPageViews()
            expect(pages).toEqual([])
        })
    })

    describe('clearCachedEvents', () => {
        test('should remove cached events from localStorage', () => {
            localStorage.setItem(CACHE_STORAGE_EVENTS, JSON.stringify([{ name: 'test' }]))

            clearCachedEvents()

            expect(localStorage.getItem(CACHE_STORAGE_EVENTS)).toBeNull()
        })

        test('should handle errors gracefully', () => {
            vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            expect(() => clearCachedEvents()).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to clear cached events', expect.any(Error))
        })
    })

    describe('clearCachedPageViews', () => {
        test('should remove cached page views from localStorage', () => {
            localStorage.setItem(CACHE_STORAGE_PAGES, JSON.stringify([{ name: '/home' }]))

            clearCachedPageViews()

            expect(localStorage.getItem(CACHE_STORAGE_PAGES)).toBeNull()
        })

        test('should handle errors gracefully', () => {
            vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
                throw new Error('localStorage error')
            })

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            expect(() => clearCachedPageViews()).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to clear cached page views', expect.any(Error))
        })
    })
})
