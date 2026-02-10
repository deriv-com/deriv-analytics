import { Growthbook } from '../src/providers/growthbook'

jest.mock('@rudderstack/analytics-js')
jest.mock('@growthbook/growthbook', () => ({
    GrowthBook: jest.fn().mockImplementation(() => ({
        init: jest.fn().mockResolvedValue(undefined),
        setAttributes: jest.fn(),
        getAttributes: jest.fn().mockReturnValue({}),
        evalFeature: jest.fn().mockReturnValue({ on: true, value: 'test' }),
        getFeatureValue: jest.fn(),
        setURL: jest.fn(),
        isOn: jest.fn().mockReturnValue(true),
        destroy: jest.fn(),
    })),
}))

describe('Growthbook Provider', () => {
    let growthbook: Growthbook

    beforeEach(() => {
        jest.clearAllMocks()

        // Reset singleton instance before each test
        Growthbook.resetInstance()

        // window.location.hostname is already 'app.deriv.com' from jest.config testEnvironmentOptions

        // Mock window.dataLayer
        ;(window as any).dataLayer = []

        growthbook = new Growthbook('clientKey', 'decryptionKey')
    })

    describe('Initialization', () => {
        test('should initialize Growthbook instance properly', () => {
            expect(growthbook.GrowthBook).toBeDefined()
        })

        test('should create singleton instance', () => {
            // Suppress expected warning about existing instance
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

            const instance1 = Growthbook.getGrowthBookInstance('key1', 'decrypt1')
            const instance2 = Growthbook.getGrowthBookInstance('key2', 'decrypt2')

            expect(instance1).toBe(instance2)
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                'GrowthBook instance already exists. Ignoring new initialization parameters.'
            )

            consoleWarnSpy.mockRestore()
        })

        test('should initialize with custom options', () => {
            const customOptions = {
                antiFlicker: true,
                navigateDelay: 500,
            }

            const customGrowthbook = new Growthbook('clientKey', 'decryptionKey', customOptions)

            expect(customGrowthbook.GrowthBook).toBeDefined()
        })

        test('should set isLoaded to true after initialization', async () => {
            // Create a fresh instance to test initialization state
            const freshGrowthbook = new Growthbook('testKey', 'testDecrypt')

            // isLoaded should be false immediately after construction (before async init completes)
            expect(freshGrowthbook.isLoaded).toBe(false)

            await freshGrowthbook.init()

            expect(freshGrowthbook.isLoaded).toBe(true)
        })
    })

    describe('Attribute Management', () => {
        test('should set attributes correctly', () => {
            const attributes = {
                id: '123',
                country: 'US',
                user_language: 'en',
                device_type: 'mobile',
                loggedIn: true,
            }

            growthbook.setAttributes(attributes)

            expect(growthbook.GrowthBook.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '123',
                    country: 'US',
                    user_language: 'en',
                    device_type: 'mobile',
                    loggedIn: true,
                })
            )
        })

        test('should merge attributes with existing ones', () => {
            growthbook.GrowthBook.getAttributes = jest.fn().mockReturnValue({ existing: 'value' })

            growthbook.setAttributes({
                id: '456',
                country: 'UK',
            })

            expect(growthbook.GrowthBook.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    existing: 'value',
                    id: '456',
                    country: 'UK',
                })
            )
        })

        test('should handle optional attributes', () => {
            growthbook.setAttributes({
                id: '789',
                utm_source: 'google',
                utm_medium: 'cpc',
            })

            expect(growthbook.GrowthBook.setAttributes).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '789',
                    utm_source: 'google',
                    utm_medium: 'cpc',
                })
            )
        })
    })

    describe('Feature Management', () => {
        test('should get feature state', () => {
            const featureId = 'feature_flag_id'

            const result = growthbook.getFeatureState(featureId)

            expect(growthbook.GrowthBook.evalFeature).toHaveBeenCalledWith(featureId)
            expect(result).toBeDefined()
        })

        test('should get feature value with default', () => {
            const featureKey = 'feature_key'
            const defaultValue = 'default_value'

            growthbook.getFeatureValue(featureKey as any, defaultValue)

            expect(growthbook.GrowthBook.getFeatureValue).toHaveBeenCalledWith(featureKey, defaultValue)
        })

        test('should check if feature is on', () => {
            const featureKey = 'test_feature'

            const result = growthbook.isOn(featureKey)

            expect(growthbook.GrowthBook.isOn).toHaveBeenCalledWith(featureKey)
            expect(result).toBe(true)
        })
    })

    describe('URL Management', () => {
        test('should set URL', () => {
            const url = 'https://example.com/page'

            growthbook.setUrl(url)

            expect(growthbook.GrowthBook.setURL).toHaveBeenCalledWith(url)
        })

        test('should reapply experiment with custom URL', () => {
            const customUrl = 'https://example.com/custom'

            growthbook.reapplyExperiment(customUrl)

            expect(growthbook.GrowthBook.setURL).toHaveBeenCalledWith(customUrl)
        })

        test('should reapply experiment with window location', () => {
            // Use the default location href from jsdom
            growthbook.reapplyExperiment()

            expect(growthbook.GrowthBook.setURL).toHaveBeenCalledWith(window.location.href)
        })
    })

    describe('Status Management', () => {
        test('should get status after loading', async () => {
            growthbook.isLoaded = true
            growthbook.status = { success: true } as any

            const status = await growthbook.getStatus()

            expect(status.isLoaded).toBe(true)
            expect(status.status).toEqual({ success: true })
        })

        test('should wait for isLoaded before returning status', async () => {
            growthbook.isLoaded = false

            setTimeout(() => {
                growthbook.isLoaded = true
            }, 100)

            const statusPromise = growthbook.getStatus()

            expect(growthbook.isLoaded).toBe(false)

            const status = await statusPromise

            expect(status.isLoaded).toBe(true)
        })
    })
})
