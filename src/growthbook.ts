import { GrowthBook } from '@growthbook/growthbook-react'
import * as RudderAnalytics from 'rudder-sdk-js'

export type GrowthBookTypes = GrowthBook

type AttributesTypes = {
    id: string
    country: string
    user_language: string
    device_language: string
    device_type: string
}
export class Growthbook {
    GrowthBook
    private static _instance: Growthbook

    constructor() {
        this.GrowthBook = new GrowthBook({
            apiHost: 'https://cdn.growthbook.io',
            clientKey: 'sdk-jJ33wcv3oAB2xvxM',
            decryptionKey: 'xI1bW4LrYj0qntz+fbBfJg==',
            enableDevMode: true,
            subscribeToChanges: true,
            trackingCallback: (experiment, result) => {
                RudderAnalytics.track('experiment_viewed', {
                    experimentId: experiment.key,
                    variationId: result.variationId,
                })
            },
            // use it for development and testing purpose
            onFeatureUsage: (featureKey, result) => {
                console.log('feature', featureKey, 'has value', result.value)
            },
        })
        this.init()
    }
    public static getInstance() {
        if (Growthbook._instance === null) {
            Growthbook._instance = new Growthbook()
            return Growthbook._instance
        }
        return Growthbook._instance
    }

    init() {
        this.GrowthBook.loadFeatures().catch((err) => console.error(err))
    }

    setAttributes({ id, country, user_language, device_language, device_type }: AttributesTypes) {
        return this.GrowthBook.setAttributes({
                id,
                country,
                user_language,
                device_language,
                device_type,
            })
    }
    useFeatureIsOn(id: string): boolean {
        return this.GrowthBook.isOn(id)
    }
    getFeatureValue(id: string, fallback: string) {
        return this.GrowthBook.getFeatureValue(id, fallback)
    }
}
