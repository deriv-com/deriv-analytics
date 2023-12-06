import { Growthbook } from '../src/growthbook'

jest.mock('rudder-sdk-js')

describe('Growthbook', () => {
    let growthbook: Growthbook

    beforeEach(() => {
        growthbook = new Growthbook('clientKey', 'decryptionKey')
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    test('should initialize Growthbook instance properly', () => {
        expect(growthbook.GrowthBook).toBeDefined()
    })

    test('should set attributes correctly in Growthbook', () => {
        growthbook.setAttributes({
            id: '123',
            country: 'US',
            user_language: 'en',
            device_type: 'mobile',
        })

        expect(growthbook.getFeatureState('feature_id')).toBeDefined()
        // Add more assertions for the setAttributes functionality
    })
})
