import { RudderAnalytics } from '@rudderstack/analytics-js'
import { RudderStack } from '../src/rudderstack'
jest.mock('@rudderstack/analytics-js', () => {
    const original_module = jest.requireActual('@rudderstack/analytics-js')
    return {
        ...original_module,
        load: jest.fn(),
        ready: (callback: () => any) => callback(),
        identify: jest.fn(),
        page: jest.fn(),
        reset: jest.fn(),
        track: jest.fn(),
        getAnonymousId: jest.fn(),
        getUserId: jest.fn(),
    }
})

describe('RudderStack', () => {
    let rudderstack: RudderStack
    const analytics = new RudderAnalytics()
    beforeEach(() => {
        rudderstack = new RudderStack('test_key')
    })

    test('should initialize RudderStack instance properly', () => {
        expect(rudderstack.has_initialized).toBe(true)
    })

    test('should identify user when identifyEvent is called', () => {
        rudderstack.identifyEvent('C123', { language: 'en' })
        expect(rudderstack.has_identified).toBe(true)
    })

    test('should properly track events when initialized and identified', () => {
        rudderstack.identifyEvent('C123', { language: 'en' })
        rudderstack.track('ce_trade_types_form', { action: 'open' })

        expect(rudderstack.current_page).toBe('')
        expect(analytics.page).not.toHaveBeenCalled()
        expect(analytics.track).toHaveBeenCalled()
    })

    test('should get anonymous ID from RudderStack', () => {
        const anonymousId = '12345'
        ;(analytics.getAnonymousId as jest.Mock).mockReturnValue(anonymousId)

        const result = rudderstack.getAnonymousId()

        expect(analytics.getAnonymousId).toHaveBeenCalled()
        expect(result).toBe(anonymousId)
    })
})
