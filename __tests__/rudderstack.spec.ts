import { RudderAnalytics } from '@rudderstack/analytics-js'
import { RudderStack } from '../src/integrations/Rudderstack'

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

describe('RudderStack', () => {
    let rudderstack: RudderStack
    const analytics = new RudderAnalytics()

    beforeEach(() => {
        jest.clearAllMocks()
        rudderstack = new RudderStack('test_key')
    })

    test('should initialize RudderStack instance properly', done => {
        // Since initialization is async, we need to wait for it
        setTimeout(() => {
            expect(rudderstack.has_initialized).toBe(true)
            done()
        }, 10)
    })

    test('should identify user when identifyEvent is called', done => {
        setTimeout(() => {
            rudderstack.identifyEvent('C123', { language: 'en' })
            expect(rudderstack.has_identified).toBe(true)
            done()
        }, 10)
    })

    test('should properly track events when initialized and identified', done => {
        setTimeout(() => {
            rudderstack.identifyEvent('C123', { language: 'en' })
            rudderstack.track('ce_trade_types_form', { action: 'open' })

            expect(rudderstack.current_page).toBe('')
            expect(rudderstack.analytics.page).not.toHaveBeenCalled()
            expect(rudderstack.analytics.track).toHaveBeenCalledWith('ce_trade_types_form', { action: 'open' })
            done()
        }, 10)
    })

    test('should get anonymous ID from RudderStack', () => {
        const anonymousId = '12345'
        ;(analytics.getAnonymousId as jest.Mock).mockReturnValue(anonymousId)

        const result = analytics.getAnonymousId()

        expect(analytics.getAnonymousId).toHaveBeenCalled()
        expect(result).toBe(anonymousId)
    })
})
