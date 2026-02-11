import { cacheTrackEvents } from '../src/utils/analytics-cache'

describe('analytics-cache - AnalyticsCacheManager', () => {
    let mockWindow: any
    let mockDocument: any

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers()

        // Mock clearInterval globally
        global.clearInterval = jest.fn(id => {
            if (id) {
                jest.clearAllTimers()
            }
        })

        // Use existing jsdom document and window
        mockDocument = document
        mockWindow = window

        // Mock document properties
        // Clear all cookies by expiring them
        document.cookie.split(';').forEach(cookie => {
            const name = cookie.split('=')[0].trim()
            if (name) {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
            }
        })
        document.querySelectorAll = jest.fn().mockReturnValue([])

        // window.location is already set from jest.config

        // Mock addEventListener
        window.addEventListener = jest.fn()

        // Clear any intervals
        cacheTrackEvents.clearInterval()
    })

    afterEach(() => {
        try {
            jest.useRealTimers()
            cacheTrackEvents.clearInterval()
        } catch (e) {
            // Ignore clearInterval errors in cleanup
        }
    })

    describe('getCookies', () => {
        test('should get cookie value by name', () => {
            mockDocument.cookie = 'test_cookie=test_value; other_cookie=other_value'

            const value = cacheTrackEvents.getCookies('test_cookie')

            expect(value).toBe('test_value')
        })

        test('should parse JSON cookie value', () => {
            const jsonValue = JSON.stringify({ key: 'value', number: 123 })
            mockDocument.cookie = `test_cookie=${encodeURIComponent(jsonValue)}`

            const value = cacheTrackEvents.getCookies('test_cookie')

            expect(value).toEqual({ key: 'value', number: 123 })
        })

        test('should return string value for non-JSON cookie', () => {
            mockDocument.cookie = 'test_cookie=plain_value'

            const value = cacheTrackEvents.getCookies('test_cookie')

            expect(value).toBe('plain_value')
        })

        test('should return null for non-existent cookie', () => {
            mockDocument.cookie = 'other_cookie=value'

            const value = cacheTrackEvents.getCookies('test_cookie')

            expect(value).toBeNull()
        })

        test('should handle URL-encoded values', () => {
            mockDocument.cookie = 'test_cookie=' + encodeURIComponent('value with spaces')

            const value = cacheTrackEvents.getCookies('test_cookie')

            expect(value).toBe('value with spaces')
        })
    })

    describe('isReady', () => {
        test('should return false when Analytics is undefined', () => {
            mockWindow.Analytics = undefined

            const ready = cacheTrackEvents.isReady()

            expect(ready).toBe(false)
        })

        test('should return false when Analytics is null', () => {
            mockWindow.Analytics = null

            const ready = cacheTrackEvents.isReady()

            expect(ready).toBe(false)
        })

        test('should return false when tracking instance is missing', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: null }),
                },
            }

            const ready = cacheTrackEvents.isReady()

            expect(ready).toBe(false)
        })

        test('should return true when Analytics is ready with tracking instance', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                },
            }

            const ready = cacheTrackEvents.isReady()

            expect(ready).toBe(true)
        })
    })

    describe('processEvent', () => {
        test('should add email hash from client_information cookie', () => {
            mockDocument.cookie = `client_information=${encodeURIComponent(JSON.stringify({ email: 'test@example.com' }))}`

            const event = cacheTrackEvents.processEvent({
                name: 'test_event',
                properties: { action: 'click' },
            })

            expect(event.properties.email_hash).toBeDefined()
            expect(event.properties.email_hash).toHaveLength(32)
        })

        test('should hash email in event properties and remove original email', () => {
            const event = cacheTrackEvents.processEvent({
                name: 'test_event',
                properties: { email: 'user@test.com', action: 'submit' },
            })

            expect(event.properties.email).toBeUndefined()
            expect(event.properties.email_hash).toBeDefined()
            expect(event.properties.email_hash).toHaveLength(32)
            expect(event.properties.action).toBe('submit')
        })

        test('should not modify event when no email present', () => {
            const originalEvent = {
                name: 'test_event',
                properties: { action: 'click', page: 'home' },
            }

            const event = cacheTrackEvents.processEvent(originalEvent)

            expect(event.properties).toEqual(originalEvent.properties)
        })

        test('should generate consistent hash for same email', () => {
            const event1 = cacheTrackEvents.processEvent({
                name: 'test_event',
                properties: { email: 'consistent@test.com' },
            })

            const event2 = cacheTrackEvents.processEvent({
                name: 'test_event',
                properties: { email: 'consistent@test.com' },
            })

            expect(event1.properties.email_hash).toBe(event2.properties.email_hash)
        })
    })

    describe('track', () => {
        test('should track event immediately when Analytics is ready', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }

            cacheTrackEvents.track({
                name: 'test_event',
                properties: { action: 'click' },
            })

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('test_event', { action: 'click' })
        })

        test('should cache event when cache flag is true', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }

            cacheTrackEvents.track(
                {
                    name: 'test_event',
                    properties: { action: 'click' },
                },
                true
            )

            expect(mockWindow.Analytics.Analytics.trackEvent).not.toHaveBeenCalled()
        })

        test('should process event before tracking', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }

            cacheTrackEvents.track({
                name: 'test_event',
                properties: { email: 'test@example.com' },
            })

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({
                    email_hash: expect.any(String),
                })
            )
            expect(mockWindow.Analytics.Analytics.trackEvent.mock.calls[0][1].email).toBeUndefined()
        })
    })

    describe('listen', () => {
        test('should add click event listener to element', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                dataset: {},
            }

            cacheTrackEvents.listen(mockElement as any, { name: 'button_click', properties: { button: 'submit' } })

            expect(mockElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
            expect(mockElement.dataset.clickEventTracking).toBe('true')
        })

        test('should not add listener if already added', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                dataset: { clickEventTracking: 'true' },
            }

            cacheTrackEvents.listen(mockElement as any, { name: 'button_click', properties: { button: 'submit' } })

            expect(mockElement.addEventListener).not.toHaveBeenCalled()
        })

        test('should call callback when provided', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                dataset: {},
            }
            const mockCallback = jest.fn().mockReturnValue({
                name: 'custom_event',
                properties: { custom: 'data' },
            })

            cacheTrackEvents.listen(mockElement as any, { name: 'button_click', properties: {} }, false, mockCallback)

            const clickHandler = mockElement.addEventListener.mock.calls[0][1]
            const mockEvent = new Event('click')
            clickHandler(mockEvent)

            expect(mockCallback).toHaveBeenCalledWith(mockEvent)
        })
    })

    describe('trackPageUnload', () => {
        test('should add beforeunload event listener', () => {
            cacheTrackEvents.trackPageUnload()

            expect(mockWindow.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
        })
    })

    describe('isPageViewSent', () => {
        test('should return false when no page view response exists', () => {
            const result = cacheTrackEvents.isPageViewSent()

            expect(result).toBe(false)
        })
    })

    describe('loadEvent', () => {
        test('should track events immediately', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }

            cacheTrackEvents.loadEvent([
                {
                    event: {
                        name: 'page_load',
                        properties: { page: 'home' },
                    },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('page_load', { page: 'home' })
        })

        test('should track multiple events', () => {
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }

            cacheTrackEvents.loadEvent([
                {
                    event: { name: 'event1', properties: {} },
                },
                {
                    event: { name: 'event2', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledTimes(2)
        })

        test('should return this for chaining', () => {
            const result = cacheTrackEvents.loadEvent([])

            expect(result).toBe(cacheTrackEvents)
        })
    })

    describe('pageLoadEvent', () => {
        beforeEach(() => {
            // pathname is already '/' from jest.config, tests will work with that
            mockWindow.Analytics = {
                Analytics: {
                    getInstances: () => ({ tracking: {} }),
                    trackEvent: jest.fn(),
                },
            }
        })

        test('should dispatch event when current page is in pages array', () => {
            cacheTrackEvents.pageLoadEvent([
                {
                    pages: [''], // Empty string represents root path "/"
                    event: { name: 'dashboard_load', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('dashboard_load', {})
        })

        test('should not dispatch event when current page is not in pages array', () => {
            cacheTrackEvents.pageLoadEvent([
                {
                    pages: ['home', 'settings'],
                    event: { name: 'page_load', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).not.toHaveBeenCalled()
        })

        test('should dispatch event when current page is not in excludedPages', () => {
            cacheTrackEvents.pageLoadEvent([
                {
                    excludedPages: ['home', 'about'],
                    event: { name: 'page_load', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('page_load', {})
        })

        test('should not dispatch event when current page is in excludedPages', () => {
            cacheTrackEvents.pageLoadEvent([
                {
                    excludedPages: [''], // Empty string represents root path "/"
                    event: { name: 'page_load', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).not.toHaveBeenCalled()
        })

        test('should call callback when provided', () => {
            const mockCallback = jest.fn().mockReturnValue({
                name: 'dynamic_event',
                properties: { dynamic: 'value' },
            })

            cacheTrackEvents.pageLoadEvent([
                {
                    pages: [''], // Empty string represents root path "/"
                    event: { name: 'static_event', properties: {} },
                    callback: mockCallback,
                },
            ])

            expect(mockCallback).toHaveBeenCalled()
            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('dynamic_event', {
                dynamic: 'value',
            })
        })

        test('should dispatch on all pages when no pages or excludedPages specified', () => {
            cacheTrackEvents.pageLoadEvent([
                {
                    event: { name: 'global_event', properties: {} },
                },
            ])

            expect(mockWindow.Analytics.Analytics.trackEvent).toHaveBeenCalledWith('global_event', {})
        })

        test('should return this for chaining', () => {
            const result = cacheTrackEvents.pageLoadEvent([])

            expect(result).toBe(cacheTrackEvents)
        })
    })

    describe('clearInterval', () => {
        test('should clear the interval', () => {
            const mockClearInterval = jest.spyOn(global, 'clearInterval')

            // Set up an interval first by calling pageView
            cacheTrackEvents.pageView()

            cacheTrackEvents.clearInterval()

            expect(mockClearInterval).toHaveBeenCalled()
        })

        test('should not throw if interval is null', () => {
            expect(() => cacheTrackEvents.clearInterval()).not.toThrow()
        })
    })

    describe('addEventHandler', () => {
        test('should return this for chaining', () => {
            const result = cacheTrackEvents.addEventHandler([])

            expect(result).toBe(cacheTrackEvents)
        })
    })
})
