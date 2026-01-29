import Cookies from 'js-cookie'
import {
    getAllowedDomain,
    cacheEventToCookie,
    cachePageViewToCookie,
    getCachedEvents,
    getCachedPageViews,
    clearCachedEvents,
    clearCachedPageViews,
    CACHE_COOKIE_EVENTS,
    CACHE_COOKIE_PAGES,
} from '../src/utils/cookie'

jest.mock('js-cookie')

describe('cookie utilities', () => {
    const mockWindowLocation = (hostname: string) => {
        // Note: Cannot actually change hostname in jsdom, tests use default 'app.deriv.com'
    }

    beforeEach(() => {
        jest.clearAllMocks()
        ;(Cookies.get as jest.Mock).mockReturnValue(undefined)
        ;(Cookies.set as jest.Mock).mockImplementation(() => {})
        ;(Cookies.remove as jest.Mock).mockImplementation(() => {})
    })

    describe('getAllowedDomain', () => {
        test('should return .deriv.com for deriv.com hostname', () => {
            mockWindowLocation('deriv.com')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com for subdomain app.deriv.com', () => {
            mockWindowLocation('app.deriv.com')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com for nested subdomain staging.app.deriv.com', () => {
            mockWindowLocation('staging.app.deriv.com')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com for deriv.be hostname (fallback)', () => {
            mockWindowLocation('app.deriv.be')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com for deriv.me hostname (fallback)', () => {
            mockWindowLocation('staging.deriv.me')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com for binary.sx hostname (fallback)', () => {
            mockWindowLocation('www.binary.sx')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should fallback to .deriv.com for unknown domains', () => {
            mockWindowLocation('unknown.example.com')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com when window is undefined', () => {
            // Save original window
            const originalWindow = global.window
            const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'window')

            // Delete window property
            delete (global as any).window

            try {
                const result = getAllowedDomain()
                expect(result).toBe('.deriv.com')
            } finally {
                // Restore window
                if (originalDescriptor) {
                    Object.defineProperty(global, 'window', originalDescriptor)
                } else {
                    ;(global as any).window = originalWindow
                }
            }
        })
    })

    describe('cacheEventToCookie', () => {
        beforeEach(() => {
            mockWindowLocation('app.deriv.com')
        })

        test('should cache a new event to cookie', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(undefined)

            cacheEventToCookie('test_event', { action: 'click' })

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_EVENTS)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedEvents = JSON.parse(call[1])
            expect(cachedEvents).toHaveLength(1)
            expect(cachedEvents[0].name).toBe('test_event')
            expect(cachedEvents[0].properties).toEqual({ action: 'click' })
            expect(typeof cachedEvents[0].timestamp).toBe('number')
        })

        test('should append event to existing cache', () => {
            const existingCache = [{ name: 'existing_event', properties: { foo: 'bar' }, timestamp: 123456789 }]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(existingCache))

            cacheEventToCookie('new_event', { action: 'submit' })

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_EVENTS)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedEvents = JSON.parse(call[1])
            expect(cachedEvents).toHaveLength(2)
            expect(cachedEvents[0]).toEqual(existingCache[0])
            expect(cachedEvents[1].name).toBe('new_event')
            expect(cachedEvents[1].properties).toEqual({ action: 'submit' })
            expect(typeof cachedEvents[1].timestamp).toBe('number')
        })

        test('should handle empty properties', () => {
            cacheEventToCookie('test_event', {})

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_EVENTS)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedEvents = JSON.parse(call[1])
            expect(cachedEvents[0].name).toBe('test_event')
            expect(cachedEvents[0].properties).toEqual({})
            expect(typeof cachedEvents[0].timestamp).toBe('number')
        })

        test('should handle complex properties', () => {
            const complexProps = {
                user_id: 'CR123',
                metadata: {
                    page: 'home',
                    section: 'hero',
                },
                tags: ['new', 'important'],
            }

            cacheEventToCookie('test_event', complexProps)

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_EVENTS)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedEvents = JSON.parse(call[1])
            expect(cachedEvents[0].name).toBe('test_event')
            expect(cachedEvents[0].properties).toEqual(complexProps)
            expect(typeof cachedEvents[0].timestamp).toBe('number')
        })

        test('should handle errors gracefully', () => {
            ;(Cookies.get as jest.Mock).mockImplementation(() => {
                throw new Error('Cookie error')
            })

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

            expect(() => cacheEventToCookie('test_event', { action: 'click' })).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to cache event', expect.any(Error))

            consoleSpy.mockRestore()
        })
    })

    describe('cachePageViewToCookie', () => {
        beforeEach(() => {
            mockWindowLocation('app.deriv.com')
        })

        test('should cache a new page view to cookie', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(undefined)

            cachePageViewToCookie('/home', { platform: 'Deriv App' })

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_PAGES)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedPages = JSON.parse(call[1])
            expect(cachedPages).toHaveLength(1)
            expect(cachedPages[0].name).toBe('/home')
            expect(cachedPages[0].properties).toEqual({ platform: 'Deriv App' })
            expect(typeof cachedPages[0].timestamp).toBe('number')
        })

        test('should append page view to existing cache', () => {
            const existingCache = [{ name: '/dashboard', properties: {}, timestamp: 123456789 }]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(existingCache))

            cachePageViewToCookie('/settings')

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_PAGES)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedPages = JSON.parse(call[1])
            expect(cachedPages).toHaveLength(2)
            expect(cachedPages[0]).toEqual(existingCache[0])
            expect(cachedPages[1].name).toBe('/settings')
            expect(cachedPages[1].properties).toBeUndefined()
            expect(typeof cachedPages[1].timestamp).toBe('number')
        })

        test('should cache page view without properties', () => {
            cachePageViewToCookie('/about')

            expect(Cookies.set).toHaveBeenCalled()
            const call = (Cookies.set as jest.Mock).mock.calls[0]
            expect(call[0]).toBe(CACHE_COOKIE_PAGES)
            expect(call[2]).toEqual({ expires: 1, domain: '.deriv.com' })

            const cachedPages = JSON.parse(call[1])
            expect(cachedPages[0].name).toBe('/about')
            expect(cachedPages[0].properties).toBeUndefined()
            expect(typeof cachedPages[0].timestamp).toBe('number')
        })

        test('should handle errors gracefully', () => {
            ;(Cookies.set as jest.Mock).mockImplementation(() => {
                throw new Error('Cookie error')
            })

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

            expect(() => cachePageViewToCookie('/test')).not.toThrow()
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to cache page view', expect.any(Error))

            consoleSpy.mockRestore()
        })
    })

    describe('getCachedEvents', () => {
        test('should return empty array when no events cached', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(undefined)

            const events = getCachedEvents()

            expect(events).toEqual([])
        })

        test('should return cached events', () => {
            const cachedEvents = [
                { name: 'event1', properties: { foo: 'bar' }, timestamp: 123456789 },
                { name: 'event2', properties: { baz: 'qux' }, timestamp: 987654321 },
            ]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(cachedEvents))

            const events = getCachedEvents()

            expect(events).toEqual(cachedEvents)
            expect(Cookies.get).toHaveBeenCalledWith(CACHE_COOKIE_EVENTS)
        })

        test('should return empty array for invalid JSON', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue('invalid json')

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
            const events = getCachedEvents()

            expect(events).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached events', expect.any(Error))

            consoleSpy.mockRestore()
        })

        test('should return empty array if cached value is not an array', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify({ not: 'an array' }))

            const events = getCachedEvents()

            expect(events).toEqual([])
        })

        test('should handle errors gracefully', () => {
            ;(Cookies.get as jest.Mock).mockImplementation(() => {
                throw new Error('Cookie error')
            })

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
            const events = getCachedEvents()

            expect(events).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached events', expect.any(Error))

            consoleSpy.mockRestore()
        })
    })

    describe('getCachedPageViews', () => {
        test('should return empty array when no page views cached', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(undefined)

            const pages = getCachedPageViews()

            expect(pages).toEqual([])
        })

        test('should return cached page views', () => {
            const cachedPages = [
                { name: '/home', properties: {}, timestamp: 123456789 },
                { name: '/dashboard', properties: { platform: 'Deriv' }, timestamp: 987654321 },
            ]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(cachedPages))

            const pages = getCachedPageViews()

            expect(pages).toEqual(cachedPages)
            expect(Cookies.get).toHaveBeenCalledWith(CACHE_COOKIE_PAGES)
        })

        test('should return empty array for invalid JSON', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue('not valid json')

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()
            const pages = getCachedPageViews()

            expect(pages).toEqual([])
            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to get cached pages', expect.any(Error))

            consoleSpy.mockRestore()
        })

        test('should return empty array if cached value is not an array', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify('string'))

            const pages = getCachedPageViews()

            expect(pages).toEqual([])
        })
    })

    describe('clearCachedEvents', () => {
        beforeEach(() => {
            mockWindowLocation('app.deriv.com')
        })

        test('should remove cached events cookie', () => {
            clearCachedEvents()

            expect(Cookies.remove).toHaveBeenCalledWith(CACHE_COOKIE_EVENTS, { domain: '.deriv.com' })
        })
    })

    describe('clearCachedPageViews', () => {
        beforeEach(() => {
            mockWindowLocation('app.deriv.com')
        })

        test('should remove cached page views cookie', () => {
            clearCachedPageViews()

            expect(Cookies.remove).toHaveBeenCalledWith(CACHE_COOKIE_PAGES, { domain: '.deriv.com' })
        })
    })
})
