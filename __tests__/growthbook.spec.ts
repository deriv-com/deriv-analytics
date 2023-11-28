import { Growthbook } from '../src/growthbook'

jest.mock('rudder-sdk-js')

describe('Growthbook init', () => {
    it('should create a new instance', () => {
        const instance = Growthbook.getGrowthBookInstance('clientKey', 'decryptionKey')
        expect(instance).toBeInstanceOf(Growthbook)
    })

    it('should return the same instance on subsequent calls', () => {
        const firstInstance = Growthbook.getGrowthBookInstance('clientKey', 'decryptionKey')
        const secondInstance = Growthbook.getGrowthBookInstance('clientKey', 'decryptionKey')
        expect(firstInstance).toBe(secondInstance)
    })
})
