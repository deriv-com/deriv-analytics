import { Posthog } from '../src/providers/posthog'

// Mock dependencies
jest.mock('posthog-js')
jest.mock('js-cookie')

import posthog from 'posthog-js'
import Cookies from 'js-cookie'

describe('Posthog Provider', () => {
    let posthogInstance: Posthog
    const mockApiKey = 'test_api_key'

    beforeEach(() => {
        jest.clearAllMocks()

        // Reset Posthog singleton
        ;(Posthog as any).instance = undefined

        // Mock posthog methods
        ;(posthog.init as jest.Mock) = jest.fn()
        ;(posthog.capture as jest.Mock) = jest.fn()
        ;(posthog.identify as jest.Mock) = jest.fn()
        ;(posthog.alias as jest.Mock) = jest.fn()
        ;(posthog.reset as jest.Mock) = jest.fn()
        ;(posthog.get_distinct_id as jest.Mock) = jest.fn(() => 'test-distinct-id')
        ;(posthog._isIdentified as jest.Mock) = jest.fn(() => false)
        ;(posthog as any).__loaded = true
        ;(posthog as any).config = {}

        // Mock Cookies
        ;(Cookies.get as jest.Mock) = jest.fn()
        ;(Cookies.set as jest.Mock) = jest.fn()

        // window.location is already set from jest.config

        // Mock localStorage
        const localStorageMock = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            clear: jest.fn(),
        }
        Object.defineProperty(window, 'localStorage', {
            writable: true,
            value: localStorageMock,
        })
    })

    describe('Initialization', () => {
        test('should throw error if API key is not provided', () => {
            expect(() => {
                Posthog.getPosthogInstance({ apiKey: '' } as any)
            }).toThrow('Posthog: API key is required')
        })

        test('should create singleton instance', () => {
            const instance1 = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            const instance2 = Posthog.getPosthogInstance({ apiKey: 'different_key' })

            expect(instance1).toBe(instance2)
        })

        test('should initialize with default options', () => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()

            expect(posthog.init).toHaveBeenCalledWith(
                mockApiKey,
                expect.objectContaining({
                    api_host: 'https://ph.deriv.com',
                    ui_host: 'https://us.posthog.com',
                    autocapture: true,
                    debug: false,
                })
            )
        })

        test('should initialize with custom options', () => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init({
                enableAutocapture: false,
                debug: true,
            })

            expect(posthog.init).toHaveBeenCalledWith(
                mockApiKey,
                expect.objectContaining({
                    api_host: 'https://ph.deriv.com', // hardcoded, cannot be overridden
                    autocapture: false,
                    debug: true,
                })
            )
        })

        test('should not initialize twice', () => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()
            posthogInstance.init()

            expect(posthog.init).toHaveBeenCalledTimes(1)
        })
    })

    describe('Domain filtering', () => {
        test('should allow events from allowed domains', () => {
            // window.location.host is 'app.deriv.com' from jest.config
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()

            const initConfig = (posthog.init as jest.Mock).mock.calls[0][1]
            const result = initConfig.before_send({ name: 'test_event' })

            expect(result).toEqual({ name: 'test_event' })
        })
    })

    describe('User identification', () => {
        beforeEach(() => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()
        })

        test('should identify user with attributes', () => {
            posthogInstance.identify('user123', {
                user_language: 'en',
                country: 'US',
                account_type: 'real',
            })

            expect(posthog.alias).toHaveBeenCalledWith('user123', 'test-distinct-id')
            expect(posthog.identify).toHaveBeenCalledWith(
                'user123',
                expect.objectContaining({
                    language: 'en',
                    country_of_residence: 'US',
                    account_type: 'real',
                })
            )
        })

        test('should track identification status', () => {
            expect(posthogInstance.isIdentified()).toBe(false)

            posthogInstance.identify('user123')

            expect(posthogInstance.isIdentified()).toBe(true)
        })
    })

    describe('Event capturing', () => {
        beforeEach(() => {
            // window.location.host is already 'app.deriv.com' from jest.config
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()
        })

        test('should capture events', () => {
            posthogInstance.capture('test_event', { action: 'click' })

            expect(posthog.capture).toHaveBeenCalledWith('test_event', { action: 'click' })
        })

        test('should flatten cta_information properties without prefix', () => {
            posthogInstance.capture('test_event', {
                action: 'click',
                cta_information: {
                    cta_name: 'signup',
                    section_name: 'hero',
                    container_name: 'header',
                },
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                action: 'click',
                cta_name: 'signup',
                section_name: 'hero',
                container_name: 'header',
            })
        })

        test('should flatten event_metadata properties without prefix (no exclusions)', () => {
            posthogInstance.capture('test_event', {
                action: 'submit',
                event_metadata: {
                    version: 2,
                    page_name: 'https://example.com',
                    device_type: 'desktop',
                    marketing_data: { utm_source: 'google' },
                    account_type: 'real',
                    user_language: 'en',
                    country_of_residence: 'US',
                },
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                action: 'submit',
                version: 2,
                page_name: 'https://example.com',
                device_type: 'desktop',
                marketing_data: { utm_source: 'google' },
                account_type: 'real',
                user_language: 'en',
                country_of_residence: 'US',
            })
        })

        test('should flatten error properties without prefix', () => {
            posthogInstance.capture('test_event', {
                action: 'submit',
                error: {
                    error_code: '404',
                    error_message: 'Not found',
                },
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                action: 'submit',
                error_code: '404',
                error_message: 'Not found',
            })
        })

        test('should handle complex nested structure correctly', () => {
            posthogInstance.capture('test_event', {
                action: 'click',
                cta_information: {
                    cta_name: 'get_started',
                    section_name: 'hero',
                },
                event_metadata: {
                    version: 2,
                    account_type: 'demo',
                    user_language: 'es',
                    page_name: 'https://example.com/home',
                    device_type: 'mobile',
                },
                error: {
                    error_code: '500',
                    error_message: 'Server error',
                },
                form_name: 'signup_form',
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                action: 'click',
                cta_name: 'get_started',
                section_name: 'hero',
                version: 2,
                account_type: 'demo',
                user_language: 'es',
                page_name: 'https://example.com/home',
                device_type: 'mobile',
                error_code: '500',
                error_message: 'Server error',
                form_name: 'signup_form',
            })
        })

        test('should keep other nested objects as-is', () => {
            posthogInstance.capture('test_event', {
                action: 'click',
                custom_data: {
                    nested: {
                        deeply: 'value',
                    },
                },
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                action: 'click',
                custom_data: {
                    nested: {
                        deeply: 'value',
                    },
                },
            })
        })

        test('should remove null, undefined, and empty string values', () => {
            posthogInstance.capture('test_event', {
                valid: 'value',
                nullValue: null,
                undefinedValue: undefined,
                emptyString: '',
            } as any)

            expect(posthog.capture).toHaveBeenCalledWith('test_event', {
                valid: 'value',
            })
        })
    })

    describe('Reset functionality', () => {
        beforeEach(() => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()
            posthogInstance.identify('user123')
        })

        test('should reset posthog state', () => {
            posthogInstance.reset()

            expect(posthog.reset).toHaveBeenCalled()
            expect(posthogInstance.isIdentified()).toBe(false)
        })
    })

    describe('Utility methods', () => {
        beforeEach(() => {
            posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
            posthogInstance.init()
        })

        test('should get distinct ID', () => {
            const distinctId = posthogInstance.getDistinctId()

            expect(distinctId).toBe('test-distinct-id')
        })

        test('should check if loaded', () => {
            expect(posthogInstance.isLoaded()).toBe(true)
        })

        test('should get instance', () => {
            const instance = posthogInstance.getInstance()

            expect(instance).toBe(posthog)
        })

        test('should update custom config', () => {
            posthogInstance.updateConfig({
                customConfig: {
                    // Note: allowedDomains, apiHost, and uiHost cannot be changed
                    // They are hardcoded in the library for security
                },
            })

            // Config should be updated - no error thrown
            expect(() => posthogInstance.capture('test_event')).not.toThrow()
        })
    })
})
