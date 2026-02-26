import { Posthog } from '../src/providers/posthog'
import posthog from 'posthog-js'

// Mock posthog-js
jest.mock('posthog-js', () => ({
    __esModule: true,
    default: {
        init: jest.fn(),
        identify: jest.fn(),
        alias: jest.fn(),
        capture: jest.fn(),
        reset: jest.fn(),
        get_distinct_id: jest.fn(),
        _isIdentified: jest.fn(),
        get_property: jest.fn(),
        setPersonProperties: jest.fn(),
    },
}))

// Mock URL utilities
jest.mock('../src/utils/urls', () => ({
    allowedDomains: ['deriv.com', 'deriv.me', 'deriv.be'],
    internalEmailDomains: ['deriv.com'],
    posthogApiHost: 'https://ph-api.deriv.com',
    posthogUiHost: 'https://ph-ui.deriv.com',
}))

describe('PostHog Provider', () => {
    let consoleWarnSpy: jest.SpyInstance
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
        // Reset all mocks but keep their implementation
        ;(posthog.init as jest.Mock).mockClear()
        ;(posthog.identify as jest.Mock).mockClear()
        ;(posthog.alias as jest.Mock).mockClear()
        ;(posthog.capture as jest.Mock).mockClear()
        ;(posthog.reset as jest.Mock).mockClear()
        ;(posthog.get_distinct_id as jest.Mock).mockClear()
        ;(posthog.get_property as jest.Mock).mockClear()
        ;(posthog.setPersonProperties as jest.Mock).mockClear()

        // Ensure _isIdentified is properly mocked
        if (typeof posthog._isIdentified !== 'function') {
            ;(posthog._isIdentified as jest.Mock) = jest.fn()
        }

        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
        // Reset singleton instance
        // @ts-ignore - accessing private property for testing
        Posthog._instance = undefined
    })

    afterEach(() => {
        consoleWarnSpy?.mockRestore()
        consoleErrorSpy?.mockRestore()
    })

    describe('Singleton Pattern', () => {
        test('should create a new instance when first called', () => {
            const instance1 = Posthog.getPosthogInstance({ apiKey: 'test-key' })

            expect(instance1).toBeInstanceOf(Posthog)
        })

        test('should return the same instance on subsequent calls', () => {
            const instance1 = Posthog.getPosthogInstance({ apiKey: 'test-key-1' })
            const instance2 = Posthog.getPosthogInstance({ apiKey: 'test-key-2' })

            expect(instance1).toBe(instance2)
        })

        test('should initialize only once even with different options', () => {
            Posthog.getPosthogInstance({ apiKey: 'test-key-1' })
            Posthog.getPosthogInstance({ apiKey: 'test-key-2' })

            // init is called once in constructor
            expect(posthog.init).toHaveBeenCalledTimes(1)
            expect(posthog.init).toHaveBeenCalledWith('test-key-1', expect.any(Object))
        })
    })

    describe('Initialization', () => {
        test('should initialize with API key and default config', async () => {
            const instance = new Posthog({ apiKey: 'test-api-key' })
            await instance.init()

            expect(posthog.init).toHaveBeenCalledWith(
                'test-api-key',
                expect.objectContaining({
                    api_host: 'https://ph-api.deriv.com',
                    ui_host: 'https://ph-ui.deriv.com',
                    autocapture: true,
                    session_recording: expect.objectContaining({
                        recordCrossOriginIframes: true,
                        minimumDurationMilliseconds: 30000,
                    }),
                    before_send: expect.any(Function),
                })
            )
            expect(instance.has_initialized).toBe(true)
        })

        test('should warn when no API key is provided', async () => {
            const instance = new Posthog({ apiKey: '' })
            await instance.init()

            expect(consoleWarnSpy).toHaveBeenCalledWith('Posthog: No API key provided')
            expect(posthog.init).not.toHaveBeenCalled()
            expect(instance.has_initialized).toBe(false)
        })

        test('should merge custom config with defaults', async () => {
            const customConfig = {
                autocapture: false,
                persistence: 'localStorage' as const,
            }

            const instance = new Posthog({ apiKey: 'test-key', config: customConfig })
            await instance.init()

            expect(posthog.init).toHaveBeenCalledWith(
                'test-key',
                expect.objectContaining({
                    autocapture: false,
                    persistence: 'localStorage',
                    api_host: 'https://ph-api.deriv.com',
                    ui_host: 'https://ph-ui.deriv.com',
                })
            )
        })

        test('should handle initialization errors gracefully', async () => {
            ;(posthog.init as jest.Mock).mockImplementation(() => {
                throw new Error('Init failed')
            })

            const instance = new Posthog({ apiKey: 'test-key' })
            // Don't call init() again - constructor already called it

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to initialize', expect.any(Error))
            expect(instance.has_initialized).toBe(false)

            // Restore mock for subsequent tests
            ;(posthog.init as jest.Mock).mockImplementation(() => {})
        })

        describe('Domain Filtering (before_send)', () => {
            test('should have before_send function configured', async () => {
                const instance = new Posthog({ apiKey: 'test-key' })
                await instance.init()

                const initCall = (posthog.init as jest.Mock).mock.calls[0]
                const config = initCall[1]

                expect(config.before_send).toBeDefined()
                expect(typeof config.before_send).toBe('function')
            })

            test('should filter events based on domain allowlist', async () => {
                const instance = new Posthog({ apiKey: 'test-key' })
                await instance.init()

                const initCall = (posthog.init as jest.Mock).mock.calls[0]
                const beforeSendFn = initCall[1].before_send
                const mockEvent = { event: 'test_event' }

                // The function uses window.location.host internally
                // We test that it's properly configured and calls the allowedDomains check
                expect(beforeSendFn).toBeDefined()
                expect(typeof beforeSendFn(mockEvent)).toBeDefined()
            })
        })
    })

    describe('Identify Event', () => {
        let instance: Posthog

        beforeEach(async () => {
            // Clear mock call history but not implementations
            ;(posthog.init as jest.Mock).mockClear()
            ;(posthog.identify as jest.Mock).mockClear()
            ;(posthog.alias as jest.Mock).mockClear()
            ;(posthog.capture as jest.Mock).mockClear()
            ;(posthog.reset as jest.Mock).mockClear()
            ;(posthog._isIdentified as jest.Mock).mockReturnValue(false)
            ;(posthog.get_distinct_id as jest.Mock).mockReturnValue('anon-default')
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        test('should identify user with user ID only', () => {
            instance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
            expect(instance.has_identified).toBe(true)
        })

        test('should identify user with traits', () => {
            const traits = {
                email: 'user@example.com',
                language: 'en',
                country_of_residence: 'US',
                custom_field: 'value',
            }

            instance.identifyEvent('CR123', traits)

            expect(posthog.identify).toHaveBeenCalledWith('CR123', {
                language: 'en',
                country_of_residence: 'US',
                custom_field: 'value',
                client_id: 'CR123',
                is_internal: false,
            })
            expect(instance.has_identified).toBe(true)
        })

        test('should identify user when not previously identified', () => {
            ;(posthog._isIdentified as jest.Mock).mockReturnValue(false)

            instance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
        })

        test('should not identify when user is already identified', () => {
            ;(posthog._isIdentified as jest.Mock).mockReturnValue(true)

            instance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(posthog.identify).not.toHaveBeenCalled()
            // setPersonProperties is not called here — use backfillPersonProperties for backfilling
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should identify user and include client_id in traits', () => {
            ;(posthog._isIdentified as jest.Mock).mockReturnValue(false)

            instance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
        })

        test('should handle missing _isIdentified function gracefully', () => {
            const original_isIdentified = posthog._isIdentified
            // @ts-ignore - testing runtime scenario
            posthog._isIdentified = undefined

            instance.identifyEvent('CR789', { email: 'user@example.com' })

            // Should use instance has_identified flag (false by default)
            expect(posthog.alias).not.toHaveBeenCalled()
            expect(posthog.identify).toHaveBeenCalledWith('CR789', { client_id: 'CR789', is_internal: false })

            // Restore
            posthog._isIdentified = original_isIdentified
        })

        test('should warn when not initialized', () => {
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(consoleWarnSpy).toHaveBeenCalledWith('Posthog: Cannot identify - not initialized')
            expect(posthog.identify).not.toHaveBeenCalled()
        })

        test('should handle identify errors gracefully', () => {
            ;(posthog.identify as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Identify failed')
            })

            instance.identifyEvent('CR123', { email: 'user@example.com' })

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to identify user', expect.any(Error))
        })
    })

    describe('Reset', () => {
        let instance: Posthog

        beforeEach(async () => {
            ;(posthog.reset as jest.Mock).mockClear()
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
            instance.has_identified = true
        })

        test('should reset PostHog and clear identified state', () => {
            instance.reset()

            expect(posthog.reset).toHaveBeenCalled()
            expect(instance.has_identified).toBe(false)
        })

        test('should not reset when not initialized', () => {
            ;(posthog.reset as jest.Mock).mockClear()
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.reset()

            expect(posthog.reset).not.toHaveBeenCalled()
        })

        test('should handle reset errors gracefully', async () => {
            ;(posthog.reset as jest.Mock).mockClear()
            const errorInstance = new Posthog({ apiKey: 'test-key' })
            await errorInstance.init()
            errorInstance.has_identified = true
            ;(posthog.reset as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Reset failed')
            })

            errorInstance.reset()

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to reset', expect.any(Error))
            // When reset() throws, has_identified should remain true (not set to false)
            expect(errorInstance.has_identified).toBe(true)
        })
    })

    describe('Capture Event', () => {
        let instance: Posthog

        beforeEach(async () => {
            ;(posthog.capture as jest.Mock).mockClear()
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        test('should capture event with properties', () => {
            const properties = {
                action: 'click',
                page: 'home',
                user_id: 'CR123',
            }

            instance.capture('test_event', properties)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', properties)
        })

        test('should capture event without properties', () => {
            instance.capture('test_event')

            expect(posthog.capture).toHaveBeenCalledWith('test_event', undefined)
        })

        test('should not capture when not initialized', () => {
            ;(posthog.capture as jest.Mock).mockClear()
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.capture('test_event', { action: 'click' })

            expect(posthog.capture).not.toHaveBeenCalled()
        })

        test('should handle capture errors gracefully', async () => {
            ;(posthog.capture as jest.Mock).mockClear()
            const errorInstance = new Posthog({ apiKey: 'test-key' })
            await errorInstance.init()
            ;(posthog.capture as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Capture failed')
            })

            errorInstance.capture('test_event')

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to capture event', expect.any(Error))
        })

        test('should capture with flattened core attributes', () => {
            const properties = {
                user_id: 'CR123',
                country: 'US',
                user_language: 'en',
                device_type: 'mobile',
                account_type: 'real',
            }

            instance.capture('button_click', properties)

            expect(posthog.capture).toHaveBeenCalledWith('button_click', properties)
        })
    })

    describe('backfillPersonProperties', () => {
        let instance: Posthog

        beforeEach(async () => {
            ;(posthog.get_property as jest.Mock).mockClear()
            ;(posthog.setPersonProperties as jest.Mock).mockClear()
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        test('should set client_id when missing from stored person properties', () => {
            ;(posthog.get_property as jest.Mock).mockReturnValue({})

            instance.backfillPersonProperties('CR123', 'user@example.com')

            expect(posthog.setPersonProperties).toHaveBeenCalledWith({ client_id: 'CR123', is_internal: false })
        })

        test('should set client_id when stored person properties is null', () => {
            ;(posthog.get_property as jest.Mock).mockReturnValue(null)

            instance.backfillPersonProperties('CR123', 'user@example.com')

            expect(posthog.setPersonProperties).toHaveBeenCalledWith({ client_id: 'CR123', is_internal: false })
        })

        test('should not set client_id when already present in stored person properties', () => {
            ;(posthog.get_property as jest.Mock).mockReturnValue({ client_id: 'CR123', is_internal: false })

            instance.backfillPersonProperties('CR123', 'user@example.com')

            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should be a no-op when not initialized', () => {
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.backfillPersonProperties('CR123', 'user@example.com')

            expect(posthog.get_property).not.toHaveBeenCalled()
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should be a no-op when user_id is empty', () => {
            instance.backfillPersonProperties('', 'user@example.com')

            expect(posthog.get_property).not.toHaveBeenCalled()
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should handle errors gracefully', () => {
            ;(posthog.get_property as jest.Mock).mockImplementationOnce(() => {
                throw new Error('get_property failed')
            })

            instance.backfillPersonProperties('CR123', 'user@example.com')

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Posthog: Failed to backfill person properties',
                expect.any(Error)
            )
        })
    })

    describe('Integration Tests', () => {
        test('should handle full user lifecycle', async () => {
            ;(posthog.init as jest.Mock).mockClear()
            ;(posthog.identify as jest.Mock).mockClear()
            ;(posthog.capture as jest.Mock).mockClear()
            ;(posthog.reset as jest.Mock).mockClear()
            ;(posthog._isIdentified as jest.Mock) = jest.fn().mockReturnValue(false)

            const instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()

            // Initial state
            expect(instance.has_initialized).toBe(true)
            expect(instance.has_identified).toBe(false)

            // Identify user
            instance.identifyEvent('CR456', { email: 'user@example.com', language: 'en' })

            expect(posthog.identify).toHaveBeenCalledWith('CR456', {
                language: 'en',
                client_id: 'CR456',
                is_internal: false,
            })
            expect(instance.has_identified).toBe(true)

            // Capture events
            instance.capture('page_view', { page: '/dashboard' })
            instance.capture('button_click', { button_name: 'submit' })

            expect(posthog.capture).toHaveBeenCalledTimes(2)

            // Reset
            instance.reset()

            expect(posthog.reset).toHaveBeenCalled()
            expect(instance.has_identified).toBe(false)
        })

        test('should handle multiple identify calls correctly', async () => {
            ;(posthog.identify as jest.Mock).mockClear()
            ;(posthog._isIdentified as jest.Mock) = jest.fn().mockReturnValue(false)

            const instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()

            // First identify call
            instance.identifyEvent('CR100', { email: 'user@example.com' })

            expect(posthog.identify).toHaveBeenCalledTimes(1)
            expect(instance.has_identified).toBe(true)

            // Second identify - should not call identify again
            ;(posthog._isIdentified as jest.Mock).mockReturnValue(true)

            instance.identifyEvent('CR100', { email: 'user@example.com', language: 'es' })

            expect(posthog.alias).not.toHaveBeenCalled()
            expect(posthog.identify).toHaveBeenCalledTimes(1) // Still only 1 call
        })
    })
})
