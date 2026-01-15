import { createAnalyticsInstance } from '../src/core/AnalyticsCore'

jest.mock('../src/analytics', () => {
    return {
        createAnalyticsInstance: jest.fn(() => ({
            pageView: jest.fn(),
            trackEvent: jest.fn(),
            setAttributes: jest.fn(),
            identifyEvent: jest.fn(),
        })),
    }
})

describe('createAnalyticsInstance happened', () => {
    let analytics: ReturnType<typeof createAnalyticsInstance> = createAnalyticsInstance()

    const options = {
        growthbookKey: 'test_growthbook_key',
        growthbookDecryptionKey: 'test_decryption_key',
        rudderstackKey: 'test_rudderstack_key',
    }

    beforeEach(() => {
        analytics = createAnalyticsInstance({
            growthbookKey: 'clientKey',
            growthbookDecryptionKey: 'decryptionKey',
            rudderstackKey: 'test_key',
        })
    })

    test('should initialize Analytics instance properly', () => {
        expect(analytics).toBeDefined()
    })

    test('should set core attributes properly', () => {
        analytics.setAttributes({
            country: 'US',
            user_language: 'en',
            device_type: 'mobile',
            account_type: 'premium',
        })

        const expectedCoreData = {
            country: 'US',
            user_language: 'en',
            device_type: 'mobile',
            account_type: 'premium',
        }

        expect(analytics.setAttributes).toHaveBeenCalledWith(expectedCoreData)
    })

    test('should call trackEvent', () => {
        analytics.trackEvent('ce_virtual_signup_form', { action: 'open' })

        expect(analytics.trackEvent).toHaveBeenCalled()
    })

    test('should call pageView with the correct parameters', () => {
        analytics.pageView('example.com', 'Example Platform')

        expect(analytics.pageView).toHaveBeenCalledWith('example.com', 'Example Platform')
    })
})
