import { Context, GrowthBook, LocalStorageStickyBucketService } from '@growthbook/growthbook'
import * as RudderAnalytics from 'rudder-sdk-js'
import { TGrowthbookAttributes } from './types'

export type GrowthbookConfigs = {
    // feature flags for framework needs
    'tracking-buttons-config': Record<string, boolean>
} & {
    // any feature flags from growthbook
    [key: string]: Record<string, boolean> | string | boolean | []
}

export class Growthbook {
    GrowthBook
    private static _instance: Growthbook

    // we have to pass settings due the specific framework implementation
    constructor(clientKey: string, decryptionKey: string, settings: Partial<Context> = {}) {
        this.GrowthBook = new GrowthBook<GrowthbookConfigs>({
            apiHost: 'https://cdn.growthbook.io',
            clientKey,
            decryptionKey,
            antiFlicker: false,
            navigateDelay: 0,
            antiFlickerTimeout: 1000,
            stickyBucketService: new LocalStorageStickyBucketService(),
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
                }
                RudderAnalytics.track('experiment_viewed', {
                    experimentId: experiment.key,
                    variationId: result.variationId,
                })
            },
            ...settings,
        })
        this.init()
    }

    // for make instance by singleton
    public static getGrowthBookInstance = (
        clientKey: string,
        decryptionKey: string,
        growthbookOptions?: Partial<Context>
    ) => {
        if (!Growthbook._instance) {
            Growthbook._instance = new Growthbook(clientKey, decryptionKey, growthbookOptions)
            return Growthbook._instance
        }
        return Growthbook._instance
    }

    setAttributes = async ({
        id,
        country,
        user_language,
        device_language,
        device_type,
        utm_source,
        utm_medium,
        utm_campaign,
        is_authorised,
        url,
    }: TGrowthbookAttributes) => {
        await this.GrowthBook.setAttributes({
            id,
            ...(country !== undefined && { country }),
            ...(user_language !== undefined && { user_language }),
            ...(device_language !== undefined && { device_language }),
            ...(device_type !== undefined && { device_type }),
            ...(utm_source !== undefined && { utm_source }),
            ...(utm_medium !== undefined && { utm_medium }),
            ...(utm_campaign !== undefined && { utm_campaign }),
            ...(is_authorised !== undefined && { is_authorised }),
            ...(url !== undefined && { url }),
        })
    }
    getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(key: K, defaultValue: V) => {
        return this.GrowthBook.getFeatureValue(key as string, defaultValue)
    }
    getFeatureState = (id: string) => this.GrowthBook.evalFeature(id)
    setUrl = (href: string) => this.GrowthBook.setURL(href)
    isOn = (key: string) => this.GrowthBook.isOn(key)

    // new one init is async, old one loadFeatures is synced
    init = () => this.GrowthBook.init({ timeout: 1000, streaming: true })
}
