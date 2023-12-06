import * as RudderAnalytics from 'rudder-sdk-js'
import { RudderStack } from '../src/rudderstack'
jest.mock('rudder-sdk-js', () => {
    const original_module = jest.requireActual('rudder-sdk-js')
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
        expect(RudderAnalytics.page).not.toHaveBeenCalled()
        expect(RudderAnalytics.track).toHaveBeenCalled()
    })
})
