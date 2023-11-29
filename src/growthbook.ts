import { GrowthBook } from '@growthbook/growthbook'
import * as RudderAnalytics from 'rudder-sdk-js'
import { TGrowthbookAttributes } from './types'

export class Growthbook {
    GrowthBook
    private static _instance: Growthbook

    // we have to pass settings due the specific framework implementation
    constructor(clientKey: string, decryptionKey: string) {
        this.GrowthBook = new GrowthBook<GrowthBook>({
            apiHost: 'https://cdn.growthbook.io',
            clientKey,
            decryptionKey,
            subscribeToChanges: true,
            enableDevMode: window?.location.hostname.includes('localhost'),
            trackingCallback: (experiment, result) => {
                if (window.dataLayer) {
                    window.dataLayer.push({
                        event: 'experiment_viewed',
                        event_category: 'experiment',
                        rudder_anonymous_id: RudderAnalytics.getAnonymousId(),
                        experiment_id: experiment.key,
                        variation_id: result.variationId,
                    })
                } else {
                    RudderAnalytics.track('experiment_viewed', {
                        experimentId: experiment.key,
                        variationId: result.variationId,
                    })
                }
            },
        })
        this.init()
    }

    // for make instance by singleton
    public static getGrowthBookInstance(clientKey: string, decryptionKey: string) {
        if (!Growthbook._instance) {
            Growthbook._instance = new Growthbook(clientKey, decryptionKey)
            return Growthbook._instance
        }
        return Growthbook._instance
    }

    setAttributes({ id, country, user_language, device_language, device_type }: TGrowthbookAttributes) {
        return this.GrowthBook.setAttributes({
            id,
            ...(country !== undefined && { country }),
            ...(user_language !== undefined && { user_language }),
            ...(device_language !== undefined && { device_language }),
            ...(device_type !== undefined && { device_type }),
        })
    }
    getFeatureState<K, V>(id: K) {
        // @ts-ignore
        return this.GrowthBook.evalFeature(id)
    }
    getFeatureValue<K, V>(key: K, defaultValue: V) {
        // @ts-ignore
        return this.GrowthBook.getFeatureValue(key, defaultValue)
    }
    setUrl(href: string) {
        return this.GrowthBook.setURL(href)
    }
    init() {
        this.GrowthBook.loadFeatures().catch(err => console.error(err))
    }
}
