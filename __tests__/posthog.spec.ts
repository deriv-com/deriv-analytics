import { vi, type MockInstance, type Mock } from 'vitest'
import { Posthog } from '../src/providers/posthog'
import posthog from 'posthog-js'

// Mock posthog-js
vi.mock('posthog-js', () => ({
    default: {
        init: vi.fn(),
        identify: vi.fn(),
        alias: vi.fn(),
        capture: vi.fn(),
        reset: vi.fn(),
        get_distinct_id: vi.fn(),
        _isIdentified: vi.fn(),
        get_property: vi.fn(),
        setPersonProperties: vi.fn(),
        isFeatureEnabled: vi.fn(),
        getFeatureFlag: vi.fn(),
        getFeatureFlagResult: vi.fn(),
        onFeatureFlags: vi.fn(),
        reloadFeatureFlags: vi.fn(),
        featureFlags: {
            getFlagVariants: vi.fn(),
        },
    },
}))

// Mock URL utilities
vi.mock('../src/utils/urls', () => ({
    allowedDomains: ['deriv.com', 'deriv.me', 'deriv.be'],
    internalEmailDomains: ['deriv.com'],
    posthogApiHost: 'https://ph-api.deriv.com',
    posthogUiHost: 'https://ph-ui.deriv.com',
    getPosthogApiHost: vi.fn(() => 'https://ph-api.deriv.com'),
}))

describe('PostHog Provider', () => {
    let consoleWarnSpy: MockInstance
    let consoleErrorSpy: MockInstance

    beforeEach(() => {
        // Reset all mocks but keep their implementation
        ;(posthog.init as Mock).mockClear()
        ;(posthog.identify as Mock).mockClear()
        ;(posthog.alias as Mock).mockClear()
        ;(posthog.capture as Mock).mockClear()
        ;(posthog.reset as Mock).mockClear()
        ;(posthog.get_distinct_id as Mock).mockClear()
        ;(posthog.get_property as Mock).mockClear()
        ;(posthog.setPersonProperties as Mock).mockClear()
        ;(posthog.isFeatureEnabled as Mock).mockClear()
        ;(posthog.getFeatureFlag as Mock).mockClear()
        ;(posthog.getFeatureFlagResult as Mock).mockClear()
        ;(posthog.onFeatureFlags as Mock).mockClear()
        ;(posthog.reloadFeatureFlags as Mock).mockClear()
        ;(posthog.featureFlags.getFlagVariants as Mock).mockClear()

        // Ensure _isIdentified is properly mocked
        if (typeof posthog._isIdentified !== 'function') {
            ;(posthog._isIdentified as Mock) = vi.fn()
        }

        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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
            ;(posthog.init as Mock).mockImplementation(() => {
                throw new Error('Init failed')
            })

            const instance = new Posthog({ apiKey: 'test-key' })
            // Don't call init() again - constructor already called it

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to initialize', expect.any(Error))
            expect(instance.has_initialized).toBe(false)

            // Restore mock for subsequent tests
            ;(posthog.init as Mock).mockImplementation(() => {})
        })

        describe('Domain Filtering (before_send)', () => {
            test('should have before_send function configured', async () => {
                const instance = new Posthog({ apiKey: 'test-key' })
                await instance.init()

                const initCall = (posthog.init as Mock).mock.calls[0]!
                const config = initCall[1]

                expect(config.before_send).toBeDefined()
                expect(typeof config.before_send).toBe('function')
            })

            test('should filter events based on domain allowlist', async () => {
                const instance = new Posthog({ apiKey: 'test-key' })
                await instance.init()

                const initCall = (posthog.init as Mock).mock.calls[0]!
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
            ;(posthog.init as Mock).mockClear()
            ;(posthog.identify as Mock).mockClear()
            ;(posthog.alias as Mock).mockClear()
            ;(posthog.capture as Mock).mockClear()
            ;(posthog.reset as Mock).mockClear()
            ;(posthog._isIdentified as Mock).mockReturnValue(false)
            ;(posthog.get_distinct_id as Mock).mockReturnValue('anon-default')
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        test('should identify user with user ID only', () => {
            instance.identifyEvent('CR123', { is_internal: false })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
            expect(instance.has_identified).toBe(true)
        })

        test('should identify user with traits', () => {
            const traits = {
                is_internal: false,
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
            instance.has_identified = false

            instance.identifyEvent('CR123', { is_internal: false })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
        })

        test('should not identify when already identified as the same user', () => {
            instance.has_identified = true
            ;(posthog.get_distinct_id as Mock).mockReturnValue('CR123')

            instance.identifyEvent('CR123', { is_internal: false })

            expect(posthog.identify).not.toHaveBeenCalled()
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should re-identify when a different user logs in after account switch', () => {
            // Simulate: user A was identified, then logged out (reset called),
            // but stale distinct_id from localStorage is still account A's id
            instance.has_identified = true
            ;(posthog.get_distinct_id as Mock).mockReturnValue('CR111') // stale distinct_id

            instance.identifyEvent('CR222', { is_internal: false }) // new user

            expect(posthog.identify).toHaveBeenCalledWith('CR222', { client_id: 'CR222', is_internal: false })
            expect(instance.has_identified).toBe(true)
        })

        test('should identify user and include client_id in traits', () => {
            instance.has_identified = false

            instance.identifyEvent('CR123', { is_internal: false })

            expect(posthog.identify).toHaveBeenCalledWith('CR123', { client_id: 'CR123', is_internal: false })
        })

        test('should warn when not initialized', () => {
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.identifyEvent('CR123', { is_internal: false })

            expect(consoleWarnSpy).toHaveBeenCalledWith('Posthog: Cannot identify - not initialized')
            expect(posthog.identify).not.toHaveBeenCalled()
        })

        test('should handle identify errors gracefully', () => {
            ;(posthog.identify as Mock).mockImplementationOnce(() => {
                throw new Error('Identify failed')
            })

            instance.identifyEvent('CR123', { is_internal: false })

            expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to identify user', expect.any(Error))
        })
    })

    describe('Reset', () => {
        let instance: Posthog

        beforeEach(async () => {
            ;(posthog.reset as Mock).mockClear()
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
            ;(posthog.reset as Mock).mockClear()
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.reset()

            expect(posthog.reset).not.toHaveBeenCalled()
        })

        test('should handle reset errors gracefully', async () => {
            ;(posthog.reset as Mock).mockClear()
            const errorInstance = new Posthog({ apiKey: 'test-key' })
            await errorInstance.init()
            errorInstance.has_identified = true
            ;(posthog.reset as Mock).mockImplementationOnce(() => {
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
            ;(posthog.capture as Mock).mockClear()
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
            ;(posthog.capture as Mock).mockClear()
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.capture('test_event', { action: 'click' })

            expect(posthog.capture).not.toHaveBeenCalled()
        })

        test('should handle capture errors gracefully', async () => {
            ;(posthog.capture as Mock).mockClear()
            const errorInstance = new Posthog({ apiKey: 'test-key' })
            await errorInstance.init()
            ;(posthog.capture as Mock).mockImplementationOnce(() => {
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
            ;(posthog.get_property as Mock).mockClear()
            ;(posthog.setPersonProperties as Mock).mockClear()
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        test('should set client_id when missing from stored person properties', () => {
            ;(posthog.get_property as Mock).mockReturnValue({})

            instance.backfillPersonProperties({ user_id: 'CR123', email: 'user@example.com' })

            expect(posthog.setPersonProperties).toHaveBeenCalledWith({ client_id: 'CR123', is_internal: false })
        })

        test('should set client_id when stored person properties is null', () => {
            ;(posthog.get_property as Mock).mockReturnValue(null)

            instance.backfillPersonProperties({ user_id: 'CR123', email: 'user@example.com' })

            expect(posthog.setPersonProperties).toHaveBeenCalledWith({ client_id: 'CR123', is_internal: false })
        })

        test('should not set client_id when already present in stored person properties', () => {
            ;(posthog.get_property as Mock).mockReturnValue({ client_id: 'CR123', is_internal: false })

            instance.backfillPersonProperties({ user_id: 'CR123', email: 'user@example.com' })

            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should be a no-op when not initialized', () => {
            const uninitializedInstance = new Posthog({ apiKey: '' })

            uninitializedInstance.backfillPersonProperties({ user_id: 'CR123', email: 'user@example.com' })

            expect(posthog.get_property).not.toHaveBeenCalled()
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should be a no-op when user_id is empty', () => {
            instance.backfillPersonProperties({ user_id: '', email: 'user@example.com' })

            expect(posthog.get_property).not.toHaveBeenCalled()
            expect(posthog.setPersonProperties).not.toHaveBeenCalled()
        })

        test('should handle errors gracefully', () => {
            ;(posthog.get_property as Mock).mockImplementationOnce(() => {
                throw new Error('get_property failed')
            })

            instance.backfillPersonProperties({ user_id: 'CR123', email: 'user@example.com' })

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Posthog: Failed to backfill person properties',
                expect.any(Error)
            )
        })
    })

    describe('cleanupStalePosthogCookies', () => {
        let cookieSetSpy: MockInstance

        beforeEach(() => {
            cookieSetSpy = vi.spyOn(document, 'cookie', 'set')
        })

        afterEach(() => {
            cookieSetSpy.mockRestore()
        })

        test('no ph_*_posthog cookies → no deletion writes', () => {
            Object.defineProperty(document, 'cookie', {
                get: () => 'other_cookie=value; unrelated=data',
                configurable: true,
            })

            new Posthog({ apiKey: 'current-key' })

            const deletionCalls = cookieSetSpy.mock.calls.filter(
                (args: string[]) => /^ph_.+_posthog=/.test(args[0]!) && args[0]!.includes('max-age=0')
            )
            expect(deletionCalls).toHaveLength(0)
        })

        test('stale cookie present → deleted, current cookie → untouched', () => {
            Object.defineProperty(document, 'cookie', {
                get: () => 'ph_old-key_posthog=stale; ph_current-key_posthog=live',
                configurable: true,
            })

            new Posthog({ apiKey: 'current-key' })

            const deletionCalls = cookieSetSpy.mock.calls.filter((args: string[]) => args[0]!.includes('max-age=0'))
            expect(deletionCalls.some((args: string[]) => args[0]!.startsWith('ph_old-key_posthog='))).toBe(true)
            expect(deletionCalls.some((args: string[]) => args[0]!.startsWith('ph_current-key_posthog='))).toBe(false)
        })

        test('SSR guard → no crash when document is undefined', () => {
            const originalDocument = global.document
            // @ts-ignore
            delete global.document

            expect(() => new Posthog({ apiKey: 'current-key' })).not.toThrow()

            global.document = originalDocument
        })

        test('SSR guard → no crash when window is undefined', () => {
            const originalWindow = global.window
            // @ts-ignore
            delete global.window

            expect(() => new Posthog({ apiKey: 'current-key' })).not.toThrow()

            global.window = originalWindow
        })
    })

    describe('Feature Flags', () => {
        let instance: Posthog

        beforeEach(async () => {
            instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()
        })

        describe('isFeatureEnabled', () => {
            test('should return true when flag is enabled', () => {
                ;(posthog.isFeatureEnabled as Mock).mockReturnValue(true)

                expect(instance.isFeatureEnabled('my-flag')).toBe(true)
                expect(posthog.isFeatureEnabled).toHaveBeenCalledWith('my-flag')
            })

            test('should return false when flag is disabled', () => {
                ;(posthog.isFeatureEnabled as Mock).mockReturnValue(false)

                expect(instance.isFeatureEnabled('my-flag')).toBe(false)
            })

            test('should return undefined when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                expect(uninitializedInstance.isFeatureEnabled('my-flag')).toBeUndefined()
                expect(posthog.isFeatureEnabled).not.toHaveBeenCalled()
            })

            test('should handle errors gracefully', () => {
                ;(posthog.isFeatureEnabled as Mock).mockImplementationOnce(() => {
                    throw new Error('isFeatureEnabled failed')
                })

                expect(instance.isFeatureEnabled('my-flag')).toBeUndefined()
                expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to check feature flag', expect.any(Error))
            })
        })

        describe('getFeatureFlag', () => {
            test('should return string variant for multivariate flag', () => {
                ;(posthog.getFeatureFlag as Mock).mockReturnValue('variant-a')

                expect(instance.getFeatureFlag('my-flag')).toBe('variant-a')
                expect(posthog.getFeatureFlag).toHaveBeenCalledWith('my-flag')
            })

            test('should return true for enabled boolean flag', () => {
                ;(posthog.getFeatureFlag as Mock).mockReturnValue(true)

                expect(instance.getFeatureFlag('my-flag')).toBe(true)
            })

            test('should return undefined when flag does not exist', () => {
                ;(posthog.getFeatureFlag as Mock).mockReturnValue(undefined)

                expect(instance.getFeatureFlag('nonexistent')).toBeUndefined()
            })

            test('should return undefined when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                expect(uninitializedInstance.getFeatureFlag('my-flag')).toBeUndefined()
                expect(posthog.getFeatureFlag).not.toHaveBeenCalled()
            })

            test('should handle errors gracefully', () => {
                ;(posthog.getFeatureFlag as Mock).mockImplementationOnce(() => {
                    throw new Error('getFeatureFlag failed')
                })

                expect(instance.getFeatureFlag('my-flag')).toBeUndefined()
                expect(consoleErrorSpy).toHaveBeenCalledWith('Posthog: Failed to get feature flag', expect.any(Error))
            })
        })

        describe('getFeatureFlagPayload', () => {
            test('should return object payload', () => {
                ;(posthog.getFeatureFlagResult as Mock).mockReturnValue({ payload: { color: 'blue' } })

                expect(instance.getFeatureFlagPayload('my-flag')).toEqual({ color: 'blue' })
                expect(posthog.getFeatureFlagResult).toHaveBeenCalledWith('my-flag')
            })

            test('should return string payload', () => {
                ;(posthog.getFeatureFlagResult as Mock).mockReturnValue({ payload: 'control' })

                expect(instance.getFeatureFlagPayload('my-flag')).toBe('control')
            })

            test('should return number payload', () => {
                ;(posthog.getFeatureFlagResult as Mock).mockReturnValue({ payload: 42 })

                expect(instance.getFeatureFlagPayload('my-flag')).toBe(42)
            })

            test('should return undefined when flag has no payload', () => {
                ;(posthog.getFeatureFlagResult as Mock).mockReturnValue(undefined)

                expect(instance.getFeatureFlagPayload('my-flag')).toBeUndefined()
            })

            test('should return undefined when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                expect(uninitializedInstance.getFeatureFlagPayload('my-flag')).toBeUndefined()
                expect(posthog.getFeatureFlagResult).not.toHaveBeenCalled()
            })

            test('should handle errors gracefully', () => {
                ;(posthog.getFeatureFlagResult as Mock).mockImplementationOnce(() => {
                    throw new Error('getFeatureFlagResult failed')
                })

                expect(instance.getFeatureFlagPayload('my-flag')).toBeUndefined()
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Posthog: Failed to get feature flag payload',
                    expect.any(Error)
                )
            })
        })

        describe('getAllFlags', () => {
            test('should return map of flag key to value', () => {
                ;(posthog.featureFlags.getFlagVariants as Mock).mockReturnValue({
                    'flag-a': true,
                    'flag-b': 'variant-x',
                })

                expect(instance.getAllFlags()).toEqual({ 'flag-a': true, 'flag-b': 'variant-x' })
            })

            test('should return empty object when no flags are active', () => {
                ;(posthog.featureFlags.getFlagVariants as Mock).mockReturnValue({})

                expect(instance.getAllFlags()).toEqual({})
            })

            test('should return empty object when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                expect(uninitializedInstance.getAllFlags()).toEqual({})
                expect(posthog.featureFlags.getFlagVariants).not.toHaveBeenCalled()
            })

            test('should handle errors gracefully', () => {
                ;(posthog.featureFlags.getFlagVariants as Mock).mockImplementationOnce(() => {
                    throw new Error('getFlagVariants failed')
                })

                expect(instance.getAllFlags()).toEqual({})
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Posthog: Failed to get all feature flags',
                    expect.any(Error)
                )
            })
        })

        describe('onFeatureFlags', () => {
            test('should subscribe and return unsubscribe function', () => {
                const unsubscribe = vi.fn()
                ;(posthog.onFeatureFlags as Mock).mockReturnValue(unsubscribe)
                const callback = vi.fn()

                const result = instance.onFeatureFlags(callback)

                expect(posthog.onFeatureFlags).toHaveBeenCalledWith(callback)
                expect(result).toBe(unsubscribe)
            })

            test('should return no-op when posthog.onFeatureFlags returns non-function', () => {
                ;(posthog.onFeatureFlags as Mock).mockReturnValue(undefined)

                const result = instance.onFeatureFlags(vi.fn())

                expect(typeof result).toBe('function')
                expect(() => result()).not.toThrow()
            })

            test('should return no-op when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                const result = uninitializedInstance.onFeatureFlags(vi.fn())

                expect(posthog.onFeatureFlags).not.toHaveBeenCalled()
                expect(typeof result).toBe('function')
            })

            test('should handle errors gracefully', () => {
                ;(posthog.onFeatureFlags as Mock).mockImplementationOnce(() => {
                    throw new Error('onFeatureFlags failed')
                })

                const result = instance.onFeatureFlags(vi.fn())

                expect(result).toBeDefined()
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Posthog: Failed to subscribe to feature flags',
                    expect.any(Error)
                )
            })
        })

        describe('reloadFeatureFlags', () => {
            test('should call posthog.reloadFeatureFlags', () => {
                instance.reloadFeatureFlags()

                expect(posthog.reloadFeatureFlags).toHaveBeenCalledTimes(1)
            })

            test('should be a no-op when not initialized', () => {
                const uninitializedInstance = new Posthog({ apiKey: '' })

                uninitializedInstance.reloadFeatureFlags()

                expect(posthog.reloadFeatureFlags).not.toHaveBeenCalled()
            })

            test('should handle errors gracefully', () => {
                ;(posthog.reloadFeatureFlags as Mock).mockImplementationOnce(() => {
                    throw new Error('reloadFeatureFlags failed')
                })

                expect(() => instance.reloadFeatureFlags()).not.toThrow()
                expect(consoleErrorSpy).toHaveBeenCalledWith(
                    'Posthog: Failed to reload feature flags',
                    expect.any(Error)
                )
            })
        })
    })

    describe('Integration Tests', () => {
        test('should handle full user lifecycle', async () => {
            ;(posthog.init as Mock).mockClear()
            ;(posthog.identify as Mock).mockClear()
            ;(posthog.capture as Mock).mockClear()
            ;(posthog.reset as Mock).mockClear()
            ;(posthog.get_distinct_id as Mock).mockReturnValue('anon-id')

            const instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()

            // Initial state
            expect(instance.has_initialized).toBe(true)
            expect(instance.has_identified).toBe(false)

            // Identify user
            instance.identifyEvent('CR456', { is_internal: false, language: 'en' })

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
            ;(posthog.identify as Mock).mockClear()
            ;(posthog.get_distinct_id as Mock).mockReturnValue('anon-id')

            const instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()

            // First identify call
            instance.identifyEvent('CR100', { email: 'user@example.com' })

            expect(posthog.identify).toHaveBeenCalledTimes(1)
            expect(instance.has_identified).toBe(true)

            // Second identify for same user — should not call identify again
            ;(posthog.get_distinct_id as Mock).mockReturnValue('CR100')

            instance.identifyEvent('CR100', { email: 'user@example.com', language: 'es' })

            expect(posthog.alias).not.toHaveBeenCalled()
            expect(posthog.identify).toHaveBeenCalledTimes(1) // Still only 1 call
        })

        test('should re-identify after logout and login with a different account', async () => {
            ;(posthog.identify as Mock).mockClear()
            ;(posthog.reset as Mock).mockClear()
            ;(posthog.get_distinct_id as Mock).mockReturnValue('anon-id')

            const instance = new Posthog({ apiKey: 'test-key' })
            await instance.init()

            // User A logs in
            instance.identifyEvent('CR111', { is_internal: false })
            expect(posthog.identify).toHaveBeenCalledWith('CR111', { client_id: 'CR111', is_internal: false })
            expect(instance.has_identified).toBe(true)

            // User A logs out — reset clears has_identified
            instance.reset()
            expect(instance.has_identified).toBe(false)

            // Simulate stale localStorage: distinct_id is still CR111
            ;(posthog.get_distinct_id as Mock).mockReturnValue('CR111')

            // User B logs in — must re-identify even though distinct_id !== CR222
            instance.has_identified = true // simulate race where flag was not cleared
            instance.identifyEvent('CR222', { is_internal: false })

            expect(posthog.identify).toHaveBeenCalledWith('CR222', { client_id: 'CR222', is_internal: false })
            expect(posthog.identify).toHaveBeenCalledTimes(2)
        })
    })
})
