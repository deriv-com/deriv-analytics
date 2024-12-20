import { Growthbook } from '../src/growthbook'

jest.mock('@rudderstack/analytics-js')

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
            country: 'US',
            user_language: 'en',
            device_type: 'mobile',
        })

        expect(growthbook.getFeatureState('feature_id')).toBeDefined()
    })

    test('should get feature state in Growthbook', () => {
        const evalFeatureMock = jest.spyOn(growthbook.GrowthBook, 'evalFeature')
        const featureId = 'FeatureID'

        growthbook.getFeatureState(featureId)

        expect(evalFeatureMock).toHaveBeenCalledWith(featureId)
    })

    test('should get feature value in Growthbook', () => {
        const getFeatureValueMock = jest.spyOn(growthbook.GrowthBook, 'getFeatureValue')
        const featureKey = 'FeatureKey'
        const defaultValue = 'DefaultValue'

        growthbook.getFeatureValue(featureKey, defaultValue)

        expect(getFeatureValueMock).toHaveBeenCalledWith(featureKey, defaultValue)
    })

    test('should set URL in Growthbook', () => {
        const setUrlMock = jest.spyOn(growthbook.GrowthBook, 'setURL')
        const url = 'https://example.com'

        growthbook.setUrl(url)

        expect(setUrlMock).toHaveBeenCalledWith(url)
    })
})
