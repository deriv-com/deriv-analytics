import { Posthog } from '../src/providers/posthog'

jest.mock('posthog-js')
jest.mock('js-cookie')

import posthog from 'posthog-js'

describe('PostHog Event Flattening - User Specification', () => {
    let posthogInstance: Posthog
    const mockApiKey = 'test_api_key'

    beforeEach(() => {
        jest.clearAllMocks()
        ;(posthog.init as jest.Mock) = jest.fn()
        ;(posthog.capture as jest.Mock) = jest.fn()
        ;(posthog.get_distinct_id as jest.Mock) = jest.fn(() => 'test-id')
        ;(posthog._isIdentified as jest.Mock) = jest.fn(() => false)
        ;(posthog as any).__loaded = true

        Object.defineProperty(window, 'location', {
            writable: true,
            value: { host: 'app.deriv.com', origin: 'https://app.deriv.com', pathname: '/home' },
        })

        posthogInstance = Posthog.getPosthogInstance({ apiKey: mockApiKey })
        posthogInstance.init()
    })

    test('should flatten special keys (cta_information, event_metadata, error) to top level', () => {
        const userEvent = {
            action: 'click',
            cta_information: {
                cta_name: 'signup_button',
                section_name: 'hero_section',
                container_name: 'main_container',
            },
            event_metadata: {
                version: 2,
                account_type: 'real',
                page_name: 'https://app.deriv.com/home',
                user_language: 'en',
                device_type: 'desktop',
                marketing_data: { utm_source: 'google', utm_campaign: 'summer' },
                is_profile_completed: true,
                country_of_residence: 'US',
            },
            error: {
                error_code: null,
                error_message: null,
            },
            form_name: 'deriv_home_web',
        }

        posthogInstance.capture('test_event', userEvent as any)

        // All fields from special keys are flattened (no exclusions)
        expect(posthog.capture).toHaveBeenCalledWith('test_event', {
            action: 'click',
            // From cta_information
            cta_name: 'signup_button',
            section_name: 'hero_section',
            container_name: 'main_container',
            // From event_metadata (all fields included)
            version: 2,
            account_type: 'real',
            page_name: 'https://app.deriv.com/home',
            user_language: 'en',
            device_type: 'desktop',
            marketing_data: { utm_source: 'google', utm_campaign: 'summer' },
            is_profile_completed: true,
            country_of_residence: 'US',
            // Top-level fields
            form_name: 'deriv_home_web',
            // Note: null error fields excluded by cleanObject
        })
    })

    test('should handle event with error properly', () => {
        const userEvent = {
            action: 'submit',
            event_metadata: {
                version: 2,
                user_language: 'es',
                device_type: 'mobile',
                country_of_residence: 'BR',
            },
            error: {
                error_code: '400',
                error_message: 'Invalid input',
            },
            form_name: 'signup_form',
        }

        posthogInstance.capture('form_error', userEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('form_error', {
            action: 'submit',
            version: 2,
            user_language: 'es',
            device_type: 'mobile',
            country_of_residence: 'BR',
            error_code: '400',
            error_message: 'Invalid input',
            form_name: 'signup_form',
        })
    })

    test('should handle event without cta_information', () => {
        const userEvent = {
            action: 'page_view',
            event_metadata: {
                version: 2,
                account_type: 'demo',
                page_name: 'https://app.deriv.com/dashboard',
                user_language: 'fr',
                device_type: 'tablet',
                country_of_residence: 'FR',
            },
            form_name: 'dashboard',
        }

        posthogInstance.capture('page_viewed', userEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('page_viewed', {
            action: 'page_view',
            version: 2,
            account_type: 'demo',
            page_name: 'https://app.deriv.com/dashboard',
            user_language: 'fr',
            device_type: 'tablet',
            country_of_residence: 'FR',
            form_name: 'dashboard',
        })
    })

    test('should handle minimal event', () => {
        const userEvent = {
            action: 'scroll',
            form_name: 'homepage',
        }

        posthogInstance.capture('scroll_event', userEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('scroll_event', {
            action: 'scroll',
            form_name: 'homepage',
        })
    })

    test('should preserve arrays in properties', () => {
        const userEvent = {
            action: 'multi_select',
            selected_items: ['option1', 'option2', 'option3'],
            event_metadata: {
                version: 2,
                user_language: 'en',
            },
        }

        posthogInstance.capture('items_selected', userEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('items_selected', {
            action: 'multi_select',
            selected_items: ['option1', 'option2', 'option3'],
            version: 2,
            user_language: 'en',
        })
    })

    test('should handle conditional cta_information based on action', () => {
        // When action is "click", cta_information is included
        const clickEvent = {
            action: 'click',
            cta_information: {
                cta_name: 'learn_more',
                section_name: 'features',
                container_name: 'feature_cards',
            },
            event_metadata: {
                version: 2,
                user_language: 'en',
                is_profile_completed: false,
                country_of_residence: 'UK',
            },
            form_name: 'features_page',
        }

        posthogInstance.capture('button_clicked', clickEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('button_clicked', {
            action: 'click',
            cta_name: 'learn_more',
            section_name: 'features',
            container_name: 'feature_cards',
            version: 2,
            user_language: 'en',
            is_profile_completed: false,
            country_of_residence: 'UK',
            form_name: 'features_page',
        })
    })

    test('should flatten all metadata fields without exclusions', () => {
        const userEvent = {
            event_metadata: {
                version: 2,
                page_name: 'https://app.deriv.com/trading',
                device_type: 'desktop',
                marketing_data: { utm_source: 'facebook', utm_medium: 'cpc' },
                account_type: 'real',
                user_language: 'de',
                country_of_residence: 'DE',
                custom_field: 'custom_value',
            },
        }

        posthogInstance.capture('metadata_test', userEvent as any)

        // All fields from event_metadata are flattened (no exclusions)
        expect(posthog.capture).toHaveBeenCalledWith('metadata_test', {
            version: 2,
            page_name: 'https://app.deriv.com/trading',
            device_type: 'desktop',
            marketing_data: { utm_source: 'facebook', utm_medium: 'cpc' },
            account_type: 'real',
            user_language: 'de',
            country_of_residence: 'DE',
            custom_field: 'custom_value',
        })

        // Verify all fields ARE in the call
        const captureCall = (posthog.capture as jest.Mock).mock.calls[0][1]
        expect(captureCall).toHaveProperty('version', 2)
        expect(captureCall).toHaveProperty('page_name', 'https://app.deriv.com/trading')
        expect(captureCall).toHaveProperty('device_type', 'desktop')
        expect(captureCall).toHaveProperty('marketing_data')
    })

    test('should handle nested objects that are NOT special keys', () => {
        const userEvent = {
            action: 'custom_action',
            custom_nested_data: {
                deeply: {
                    nested: 'value',
                },
            },
            event_metadata: {
                version: 2,
                user_language: 'ja',
            },
        }

        posthogInstance.capture('custom_event', userEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('custom_event', {
            action: 'custom_action',
            custom_nested_data: {
                deeply: {
                    nested: 'value',
                },
            },
            version: 2,
            user_language: 'ja',
        })
    })

    test('should handle flexible consumer data structures', () => {
        // Different consumer with different fields
        const consumerEvent = {
            event_type: 'trade_completed',
            cta_information: {
                button_id: 'trade_btn_123',
                position: 'top',
            },
            event_metadata: {
                trade_type: 'forex',
                trade_amount: 1000,
                currency: 'USD',
                platform: 'web',
            },
            custom_tracking: {
                session_id: 'abc123',
                feature_flags: ['new_ui', 'beta_features'],
            },
        }

        posthogInstance.capture('trade_event', consumerEvent as any)

        expect(posthog.capture).toHaveBeenCalledWith('trade_event', {
            event_type: 'trade_completed',
            // cta_information flattened
            button_id: 'trade_btn_123',
            position: 'top',
            // event_metadata flattened
            trade_type: 'forex',
            trade_amount: 1000,
            currency: 'USD',
            platform: 'web',
            // custom_tracking preserved as nested (not a special key)
            custom_tracking: {
                session_id: 'abc123',
                feature_flags: ['new_ui', 'beta_features'],
            },
        })
    })
})
