import { vi, type Mock } from 'vitest'
import { createAnalyticsInstance } from '../src/analytics'

// Mock dependencies
vi.mock('../src/providers/rudderstack')
vi.mock('../src/utils/storage')
vi.mock('../src/utils/helpers', async importOriginal => ({
    ...(await importOriginal<typeof import('../src/utils/helpers')>()),
    getCountry: vi.fn(),
    isUUID: vi.fn(),
}))

import { RudderStack } from '../src/providers/rudderstack'
import * as storageUtils from '../src/utils/storage'
import { getCountry, isUUID } from '../src/utils/helpers'

describe('Analytics - createAnalyticsInstance', () => {
    let mockRudderstack: any
    let analytics: ReturnType<typeof createAnalyticsInstance>

    beforeEach(() => {
        vi.clearAllMocks()

        // Mock RudderStack instance
        mockRudderstack = {
            has_initialized: true,
            track: vi.fn(),
            pageView: vi.fn(),
            identifyEvent: vi.fn(),
            reset: vi.fn(),
            getUserId: vi.fn().mockReturnValue('CR123'),
            getAnonymousId: vi.fn().mockReturnValue('anon-123'),
        }
        ;(RudderStack.getRudderStackInstance as Mock).mockImplementation((_key, callback) => {
            // Call the callback asynchronously to simulate SDK loading
            if (callback && typeof callback === 'function') {
                setTimeout(() => callback(), 0)
            }
            return mockRudderstack
        })
        ;(getCountry as Mock).mockResolvedValue('us')
        ;(isUUID as Mock).mockReturnValue(false)
        ;(storageUtils.getCachedEvents as Mock).mockReturnValue([])
        ;(storageUtils.getCachedPageViews as Mock).mockReturnValue([])
        ;(storageUtils.cacheEventToStorage as Mock).mockImplementation(() => {})
        ;(storageUtils.cachePageViewToStorage as Mock).mockImplementation(() => {})
        ;(storageUtils.clearCachedEvents as Mock).mockImplementation(() => {})
        ;(storageUtils.clearCachedPageViews as Mock).mockImplementation(() => {})
    })

    describe('Initialization', () => {
        test('should create analytics instance without options', () => {
            analytics = createAnalyticsInstance()

            expect(analytics).toBeDefined()
            expect(analytics.trackEvent).toBeDefined()
            expect(analytics.pageView).toBeDefined()
            expect(analytics.setAttributes).toBeDefined()
            expect(analytics.identifyEvent).toBeDefined()
        })

        test('should initialize with RudderStack key', async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })

            expect(RudderStack.getRudderStackInstance).toHaveBeenCalledWith('test_key', expect.any(Function), false)
        })

        test('should initialize with Growthbook options', async () => {
            analytics = createAnalyticsInstance()

            // Mock Growthbook module
            vi.mock('../src/providers/growthbook', () => ({
                Growthbook: {
                    getGrowthBookInstance: vi.fn().mockReturnValue({
                        setAttributes: vi.fn(),
                        getFeatureValue: vi.fn(),
                    }),
                },
            }))

            await analytics.initialise({
                growthbookKey: 'gb_key',
                growthbookDecryptionKey: 'decrypt_key',
                rudderstackKey: 'rs_key',
            })

            expect(RudderStack.getRudderStackInstance).toHaveBeenCalled()
        })

        test('should handle initialization errors gracefully', async () => {
            ;(RudderStack.getRudderStackInstance as Mock).mockImplementation(() => {
                throw new Error('Initialization error')
            })

            analytics = createAnalyticsInstance()
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

            await analytics.initialise({ rudderstackKey: 'test_key' })

            expect(consoleSpy).toHaveBeenCalledWith('Analytics: Failed to initialize', expect.any(Error))
            consoleSpy.mockRestore()
        })
    })

    describe('setAttributes', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
            // Wait for async initialization callback
            await new Promise(resolve => setTimeout(resolve, 10))
        })

        test('should set core attributes', () => {
            analytics.setAttributes({
                country: 'US',
                user_language: 'en',
                device_type: 'mobile',
                account_type: 'real',
            })

            // Verify by tracking an event and checking payload
            analytics.trackEvent('test_event', {})

            expect(mockRudderstack.track).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({
                    country: 'US',
                    user_language: 'en',
                    device_type: 'mobile',
                    account_type: 'real',
                })
            )
        })

        test('should filter out UUID user IDs', () => {
            ;(isUUID as Mock).mockReturnValue(true)

            analytics.setAttributes({
                user_id: '550e8400-e29b-41d4-a716-446655440000',
                country: 'US',
            })

            analytics.trackEvent('test_event', {})

            const callArgs = mockRudderstack.track.mock.calls[0][1]
            expect(callArgs.user_id).toBeUndefined()
        })

        test('should include non-UUID user IDs', () => {
            ;(isUUID as Mock).mockReturnValue(false)

            analytics.setAttributes({
                user_id: 'CR123456',
                country: 'US',
            })

            analytics.trackEvent('test_event', {})

            expect(mockRudderstack.track).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({
                    user_id: 'CR123456',
                })
            )
        })

        test('should do nothing if RudderStack is not initialized', () => {
            const newAnalytics = createAnalyticsInstance()

            expect(() => {
                newAnalytics.setAttributes({
                    country: 'US',
                })
            }).not.toThrow()
        })
    })

    describe('trackEvent', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
            // Wait for async initialization callback
            await new Promise(resolve => setTimeout(resolve, 10))
        })

        test('should pass through arbitrary nested payload as-is', async () => {
            await new Promise(resolve => setTimeout(resolve, 10))
            expect(mockRudderstack.has_initialized).toBe(true)

            const payload = {
                event_metadata: { page: 'home' },
                cta_information: { button: 'submit' },
            }

            analytics.trackEvent('test_event', payload)

            expect(mockRudderstack.track).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({
                    event_metadata: expect.any(Object),
                    cta_information: payload.cta_information,
                })
            )
        })

        test('should track event with properties', () => {
            analytics.trackEvent('test_event', { action: 'click', page: 'home' })

            expect(mockRudderstack.track).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({ action: 'click', page: 'home' })
            )
        })

        test('should include user ID in event payload', () => {
            mockRudderstack.getUserId.mockReturnValue('CR123')

            analytics.trackEvent('test_event', { action: 'submit' })

            expect(mockRudderstack.track).toHaveBeenCalledWith(
                'test_event',
                expect.objectContaining({
                    user_id: 'CR123',
                })
            )
        })

        test('should cache event when offline', () => {
            Object.defineProperty(navigator, 'onLine', {
                writable: true,
                value: false,
            })

            analytics.trackEvent('test_event', { action: 'click' })

            // Event should not be sent immediately
            expect(mockRudderstack.track).not.toHaveBeenCalled()
        })

        test('should cache event to storage when RudderStack not initialized', () => {
            const originalValue = mockRudderstack.has_initialized
            mockRudderstack.has_initialized = false

            analytics.trackEvent('test_event', { action: 'click' })

            expect(storageUtils.cacheEventToStorage).toHaveBeenCalledWith('test_event', expect.any(Object))

            // Restore original value
            mockRudderstack.has_initialized = originalValue
        })
    })

    describe('pageView', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
            // Wait for async initialization callback
            await new Promise(resolve => setTimeout(resolve, 10))
        })

        test('should track page view', () => {
            analytics.pageView('/dashboard')

            expect(mockRudderstack.pageView).toHaveBeenCalledWith('/dashboard', 'Deriv App', 'CR123', undefined)
        })

        test('should track page view with custom platform', () => {
            analytics.pageView('/settings', 'Custom App')

            expect(mockRudderstack.pageView).toHaveBeenCalledWith('/settings', 'Custom App', 'CR123', undefined)
        })

        test('should track page view with properties', () => {
            analytics.pageView('/home', 'Deriv App', { section: 'hero' })

            expect(mockRudderstack.pageView).toHaveBeenCalledWith('/home', 'Deriv App', 'CR123', { section: 'hero' })
        })

        test('should cache page view when RudderStack not initialized', async () => {
            const newAnalytics = createAnalyticsInstance()
            // Initialize but mock RudderStack as not yet initialized
            mockRudderstack.has_initialized = false
            await newAnalytics.initialise({ rudderstackKey: 'test_key' })
            await new Promise(resolve => setTimeout(resolve, 10))

            newAnalytics.pageView('/dashboard')

            expect(storageUtils.cachePageViewToStorage).toHaveBeenCalled()

            // Restore
            mockRudderstack.has_initialized = true
        })
    })

    describe('identifyEvent', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
        })

        test('should identify user with user ID', () => {
            analytics.identifyEvent('CR123')

            expect(mockRudderstack.identifyEvent).toHaveBeenCalledWith('CR123', undefined)
        })

        test('should identify user with user ID and traits', () => {
            analytics.identifyEvent('CR123', { language: 'en', country_of_residence: 'US' })

            expect(mockRudderstack.identifyEvent).toHaveBeenCalledWith(
                'CR123',
                expect.objectContaining({ language: 'en', country_of_residence: 'US' })
            )
        })

        test('should use stored user ID if not provided', () => {
            mockRudderstack.getUserId.mockReturnValue('CR456')

            analytics.identifyEvent()

            expect(mockRudderstack.identifyEvent).toHaveBeenCalledWith('CR456', undefined)
        })

        test('should not identify if no user ID available', () => {
            mockRudderstack.getUserId.mockReturnValue('')

            analytics.identifyEvent()

            expect(mockRudderstack.identifyEvent).not.toHaveBeenCalled()
        })

        test('should identify with provider-specific traits', () => {
            analytics.identifyEvent('CR789', {
                rudderstack: { language: 'es', custom_field: 'value' },
                posthog: { language: 'es', country_of_residence: 'ES' },
            })

            expect(mockRudderstack.identifyEvent).toHaveBeenCalledWith(
                'CR789',
                expect.objectContaining({ language: 'es', custom_field: 'value' })
            )
        })
    })

    describe('reset', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
        })

        test('should reset RudderStack', () => {
            analytics.reset()

            expect(mockRudderstack.reset).toHaveBeenCalled()
        })
    })

    describe('Utility methods', () => {
        beforeEach(async () => {
            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })
        })

        test('getId should return user ID', () => {
            mockRudderstack.getUserId.mockReturnValue('CR123')

            const userId = analytics.getId()

            expect(userId).toBe('CR123')
        })

        test('getId should filter out UUID', () => {
            mockRudderstack.getUserId.mockReturnValue('550e8400-e29b-41d4-a716-446655440000')
            ;(isUUID as Mock).mockReturnValue(true)

            const userId = analytics.getId()

            expect(userId).toBe('')
        })

        test('getAnonymousId should return anonymous ID', () => {
            mockRudderstack.getAnonymousId.mockReturnValue('anon-456')

            const anonId = analytics.getAnonymousId()

            expect(anonId).toBe('anon-456')
        })

        test('getInstances should return provider instances', () => {
            const instances = analytics.getInstances()

            expect(instances.tracking).toBe(mockRudderstack)
        })
    })

    describe('Storage cache processing', () => {
        test('should process cached events on initialization', async () => {
            const cachedEvents = [
                { name: 'cached_event_1', properties: { action: 'click' }, timestamp: Date.now() },
                { name: 'cached_event_2', properties: { action: 'submit' }, timestamp: Date.now() },
            ]
            ;(storageUtils.getCachedEvents as Mock).mockReturnValue(cachedEvents)

            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })

            // Wait for cache processing
            await new Promise(resolve => setTimeout(resolve, 100))

            expect(mockRudderstack.track).toHaveBeenCalledWith('cached_event_1', expect.any(Object))
            expect(mockRudderstack.track).toHaveBeenCalledWith('cached_event_2', expect.any(Object))
            expect(storageUtils.clearCachedEvents).toHaveBeenCalled()
        })

        test('should process cached page views on initialization', async () => {
            const cachedPages = [
                { name: '/home', properties: {}, timestamp: Date.now() },
                { name: '/dashboard', properties: {}, timestamp: Date.now() },
            ]
            ;(storageUtils.getCachedPageViews as Mock).mockReturnValue(cachedPages)

            analytics = createAnalyticsInstance()
            await analytics.initialise({ rudderstackKey: 'test_key' })

            // Wait for cache processing
            await new Promise(resolve => setTimeout(resolve, 100))

            expect(mockRudderstack.pageView).toHaveBeenCalledWith('/home', 'Deriv App', expect.any(String), {})
            expect(mockRudderstack.pageView).toHaveBeenCalledWith('/dashboard', 'Deriv App', expect.any(String), {})
            expect(storageUtils.clearCachedPageViews).toHaveBeenCalled()
        })
    })
})
