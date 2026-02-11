import { RudderAnalytics } from '@rudderstack/analytics-js'
import { RudderStack } from '../src/providers/rudderstack'

jest.mock('@rudderstack/analytics-js', () => {
    return {
        RudderAnalytics: jest.fn().mockImplementation(() => {
            return {
                load: jest.fn().mockImplementation((key, url, options) => {
                    if (options?.onLoaded) {
                        setTimeout(options.onLoaded, 0)
                    }
                }),
                ready: (callback: () => any) => callback(),
                identify: jest.fn(),
                page: jest.fn(),
                reset: jest.fn(),
                track: jest.fn(),
                getAnonymousId: jest.fn(),
                getUserId: jest.fn(),
            }
        }),
    }
})

describe('RudderStack Provider', () => {
    let rudderstack: RudderStack

    beforeEach(() => {
        jest.clearAllMocks()
        document.cookie = ''

        // window.location.hostname is already 'app.deriv.com' from jest.config

        // Mock crypto.randomUUID
        Object.defineProperty(global, 'crypto', {
            writable: true,
            configurable: true,
            value: {
                randomUUID: jest.fn(() => 'test-uuid-123'),
            },
        })
    })

    describe('Initialization', () => {
        test('should initialize RudderStack instance properly', done => {
            rudderstack = new RudderStack('test_key')

            setTimeout(() => {
                expect(rudderstack.has_initialized).toBe(true)
                done()
            }, 10)
        })

        test('should create singleton instance', () => {
            const instance1 = RudderStack.getRudderStackInstance('key1')
            const instance2 = RudderStack.getRudderStackInstance('key2')

            expect(instance1).toBe(instance2)
        })

        test('should call onLoaded callback when initialized', done => {
            const onLoaded = jest.fn()

            rudderstack = new RudderStack('test_key', onLoaded)

            setTimeout(() => {
                expect(onLoaded).toHaveBeenCalled()
                done()
            }, 10)
        })

        test('should not initialize without key', () => {
            // Suppress expected warning about missing key
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

            rudderstack = new RudderStack('')

            expect(rudderstack.analytics.load).not.toHaveBeenCalled()
            expect(consoleWarnSpy).toHaveBeenCalledWith('RudderStack: Initialization skipped - no key provided')

            consoleWarnSpy.mockRestore()
        })
    })

    describe('Anonymous ID Management', () => {
        test('should get anonymous ID from cookie', () => {
            // Set cookie before creating instance so it's picked up during init
            document.cookie = 'rudder_anonymous_id=anon-123; path=/; Domain=deriv.com'
            rudderstack = new RudderStack('test_key')

            const anonId = rudderstack.getAnonymousId()

            expect(anonId).toBe('anon-123')
        })
    })

    describe('User Identification', () => {
        beforeEach(done => {
            rudderstack = new RudderStack('test_key')
            setTimeout(done, 10)
        })

        test('should identify user when identifyEvent is called', () => {
            rudderstack.analytics.getUserId = jest.fn().mockReturnValue(null)

            rudderstack.identifyEvent('CR123', { language: 'en' })

            expect(rudderstack.analytics.identify).toHaveBeenCalledWith('CR123', { language: 'en' })
            expect(rudderstack.has_identified).toBe(true)
        })

        test('should not call identify if user already identified', () => {
            rudderstack.analytics.getUserId = jest.fn().mockReturnValue('CR123')

            rudderstack.identifyEvent('CR123', { language: 'en' })

            expect(rudderstack.analytics.identify).not.toHaveBeenCalled()
            expect(rudderstack.has_identified).toBe(true)
        })

        test('should get user ID from analytics', () => {
            rudderstack.analytics.getUserId = jest.fn().mockReturnValue('CR456')

            const userId = rudderstack.getUserId()

            expect(userId).toBe('CR456')
        })
    })

    describe('Page View Tracking', () => {
        beforeEach(done => {
            rudderstack = new RudderStack('test_key')
            setTimeout(done, 10)
        })

        test('should track page view', () => {
            rudderstack.pageView('/dashboard', 'Deriv App', 'CR123')

            expect(rudderstack.analytics.page).toHaveBeenCalledWith('Deriv App', '/dashboard', { user_id: 'CR123' })
            expect(rudderstack.current_page).toBe('/dashboard')
        })

        test('should track page view with custom properties', () => {
            rudderstack.pageView('/home', 'Deriv App', 'CR123', { section: 'hero' })

            expect(rudderstack.analytics.page).toHaveBeenCalledWith('Deriv App', '/home', {
                user_id: 'CR123',
                section: 'hero',
            })
        })

        test('should not track same page twice', () => {
            rudderstack.pageView('/dashboard', 'Deriv App', 'CR123')
            rudderstack.pageView('/dashboard', 'Deriv App', 'CR123')

            expect(rudderstack.analytics.page).toHaveBeenCalledTimes(1)
        })

        test('should not track page view if not initialized', () => {
            rudderstack.has_initialized = false

            rudderstack.pageView('/dashboard', 'Deriv App', 'CR123')

            expect(rudderstack.analytics.page).not.toHaveBeenCalled()
        })

        test('should track page view without user_id', () => {
            rudderstack.pageView('/dashboard', 'Deriv App', '')

            expect(rudderstack.analytics.page).toHaveBeenCalledWith('Deriv App', '/dashboard', {})
        })
    })

    describe('Event Tracking', () => {
        beforeEach(done => {
            rudderstack = new RudderStack('test_key')
            setTimeout(done, 10)
        })

        test('should track events with payload', () => {
            rudderstack.track('ce_trade_types_form' as any, { action: 'open' })

            expect(rudderstack.analytics.track).toHaveBeenCalledWith('ce_trade_types_form', { action: 'open' })
        })

        test('should filter out undefined values from payload', () => {
            rudderstack.track(
                'test_event' as any,
                {
                    action: 'click',
                    undefined_value: undefined,
                    null_value: null,
                } as any
            )

            expect(rudderstack.analytics.track).toHaveBeenCalledWith('test_event', {
                action: 'click',
                null_value: null,
            })
        })

        test('should not track if not initialized', () => {
            rudderstack.has_initialized = false

            rudderstack.track('test_event' as any, { action: 'click' })

            expect(rudderstack.analytics.track).not.toHaveBeenCalled()
        })

        test('should handle tracking errors gracefully', () => {
            rudderstack.analytics.track = jest.fn().mockImplementation(() => {
                throw new Error('Tracking error')
            })

            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

            rudderstack.track('test_event' as any, { action: 'click' })

            expect(consoleSpy).toHaveBeenCalledWith('RudderStack: Failed to track event', expect.any(Error))

            consoleSpy.mockRestore()
        })
    })

    describe('Reset Functionality', () => {
        beforeEach(done => {
            rudderstack = new RudderStack('test_key')
            setTimeout(done, 10)
        })

        test('should reset analytics', () => {
            rudderstack.has_identified = true

            rudderstack.reset()

            expect(rudderstack.analytics.reset).toHaveBeenCalled()
            expect(rudderstack.has_identified).toBe(false)
        })

        test('should not reset if not initialized', () => {
            rudderstack.has_initialized = false

            rudderstack.reset()

            expect(rudderstack.analytics.reset).not.toHaveBeenCalled()
        })
    })
})
