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
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                hostname,
            },
        })
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

        test('should return empty string for localhost', () => {
            mockWindowLocation('localhost')
            expect(getAllowedDomain()).toBe('')
        })

        test('should return .deriv.be for deriv.be hostname', () => {
            mockWindowLocation('app.deriv.be')
            expect(getAllowedDomain()).toBe('.deriv.be')
        })

        test('should return .deriv.me for deriv.me hostname', () => {
            mockWindowLocation('staging.deriv.me')
            expect(getAllowedDomain()).toBe('.deriv.me')
        })

        test('should return .binary.sx for binary.sx hostname', () => {
            mockWindowLocation('www.binary.sx')
            expect(getAllowedDomain()).toBe('.binary.sx')
        })

        test('should fallback to .deriv.com for unknown domains', () => {
            mockWindowLocation('unknown.example.com')
            expect(getAllowedDomain()).toBe('.deriv.com')
        })

        test('should return .deriv.com when window is undefined', () => {
            const originalWindow = global.window
            ;(global as any).window = undefined
            const result = getAllowedDomain()
            ;(global as any).window = originalWindow
            expect(result).toBe('.deriv.com')
        })
    })

    describe('cacheEventToCookie', () => {
        beforeEach(() => {
            mockWindowLocation('app.deriv.com')
        })

        test('should cache a new event to cookie', () => {
            ;(Cookies.get as jest.Mock).mockReturnValue(undefined)

            cacheEventToCookie('test_event', { action: 'click' })

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_EVENTS,
                JSON.stringify([
                    {
                        name: 'test_event',
                        properties: { action: 'click' },
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
        })

        test('should append event to existing cache', () => {
            const existingCache = [{ name: 'existing_event', properties: { foo: 'bar' }, timestamp: 123456789 }]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(existingCache))

            cacheEventToCookie('new_event', { action: 'submit' })

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_EVENTS,
                JSON.stringify([
                    ...existingCache,
                    {
                        name: 'new_event',
                        properties: { action: 'submit' },
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
        })

        test('should handle localhost domain', () => {
            mockWindowLocation('localhost')

            cacheEventToCookie('test_event', { action: 'click' })

            expect(Cookies.set).toHaveBeenCalledWith(CACHE_COOKIE_EVENTS, expect.any(String), { expires: 1 })
        })

        test('should handle empty properties', () => {
            cacheEventToCookie('test_event', {})

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_EVENTS,
                JSON.stringify([
                    {
                        name: 'test_event',
                        properties: {},
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
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

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_EVENTS,
                JSON.stringify([
                    {
                        name: 'test_event',
                        properties: complexProps,
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
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

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_PAGES,
                JSON.stringify([
                    {
                        name: '/home',
                        properties: { platform: 'Deriv App' },
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
        })

        test('should append page view to existing cache', () => {
            const existingCache = [{ name: '/dashboard', properties: {}, timestamp: 123456789 }]
            ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(existingCache))

            cachePageViewToCookie('/settings')

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_PAGES,
                JSON.stringify([
                    ...existingCache,
                    {
                        name: '/settings',
                        properties: undefined,
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
        })

        test('should cache page view without properties', () => {
            cachePageViewToCookie('/about')

            expect(Cookies.set).toHaveBeenCalledWith(
                CACHE_COOKIE_PAGES,
                JSON.stringify([
                    {
                        name: '/about',
                        properties: undefined,
                        timestamp: expect.any(Number),
                    },
                ]),
                { expires: 1, domain: '.deriv.com' }
            )
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

        test('should remove cookie without domain for localhost', () => {
            mockWindowLocation('localhost')

            clearCachedEvents()

            expect(Cookies.remove).toHaveBeenCalledWith(CACHE_COOKIE_EVENTS, {})
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

        test('should remove cookie without domain for localhost', () => {
            mockWindowLocation('localhost')

            clearCachedPageViews()

            expect(Cookies.remove).toHaveBeenCalledWith(CACHE_COOKIE_PAGES, {})
        })
    })
})
