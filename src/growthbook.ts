import { Context, GrowthBook } from '@growthbook/growthbook'
import { RudderAnalytics } from '@rudderstack/analytics-js'
import { TCoreAttributes, TGrowthbookAttributes, TGrowthbookOptions } from './types'

export type GrowthbookConfigs = {
    // feature flags for framework needs
    'tracking-buttons-config': Record<string, boolean>
} & {
    // any feature flags from growthbook
    [key: string]: Record<string, boolean> | string | boolean | []
}

export class Growthbook {
    analytics = new RudderAnalytics()
    GrowthBook
    private static _instance: Growthbook
    error = null
    isLoaded = false

    // we have to pass settings due the specific framework implementation
    constructor(clientKey: string, decryptionKey: string, growthbookOptions: TGrowthbookOptions = {}) {
        this.GrowthBook = new GrowthBook<GrowthbookConfigs>({
            apiHost: 'https://cdn.growthbook.io',
            clientKey,
            decryptionKey,
            antiFlicker: false,
            navigateDelay: 0,
            antiFlickerTimeout: 3500,
            subscribeToChanges: true,
            enableDevMode: window?.location.hostname.includes('localhost'),
            trackingCallback: (experiment, result) => {
                if (window.dataLayer) {
                    window.dataLayer.push({
                        event: 'experiment_viewed',
                        event_category: 'experiment',
                        rudder_anonymous_id: this.analytics.getAnonymousId(),
                        experiment_id: experiment.key,
                        variation_id: result.variationId,
                    })
                }
                this.analytics.track('experiment_viewed', {
                    experimentId: experiment.key,
                    variationId: result.variationId,
                })
            },
            ...growthbookOptions,
        })
        this.init()
    }

    // for make instance by singleton
    public static getGrowthBookInstance = (
        clientKey: string,
        decryptionKey?: string,
        growthbookOptions?: TGrowthbookOptions
    ) => {
        if (!Growthbook._instance) {
            Growthbook._instance = new Growthbook(clientKey, decryptionKey ?? '', growthbookOptions)
            return Growthbook._instance
        }
        return Growthbook._instance
    }

    // Utility function to wait for isLoaded to become true
    private waitForIsLoaded(): Promise<void> {
        return new Promise(resolve => {
            const checkInterval = setInterval(() => {
                if (this.isLoaded) {
                    clearInterval(checkInterval)
                    resolve()
                }
            }, 100)
        })
    }

    setAttributes = ({
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
        domain,
        utm_content,
        residence_country,
        loggedIn,
    }: TGrowthbookAttributes) => {
        const CURRENT_ATTRIBUTES = this.GrowthBook.getAttributes()
        this.GrowthBook.setAttributes({
            ...CURRENT_ATTRIBUTES,
            id,
            ...(country && { country }),
            ...(residence_country && { residence_country }),
            ...(user_language && { user_language }),
            ...(device_language && { device_language }),
            ...(device_type && { device_type }),
            ...(utm_source && { utm_source }),
            ...(utm_medium && { utm_medium }),
            ...(utm_campaign && { utm_campaign }),
            ...(is_authorised && { is_authorised }),
            ...(url && { url }),
            ...(domain && { domain }),
            ...(utm_content && { utm_content }),
            ...(loggedIn && { loggedIn }),
        })
    }
    getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(key: K, defaultValue: V) => {
        return this.GrowthBook.getFeatureValue(key as string, defaultValue)
    }
    getStatus = async (): Promise<{ isLoaded: boolean; error: null }> => {
        await this.waitForIsLoaded()

        return {
            isLoaded: this.isLoaded,
            error: this.error,
        }
    }
    getFeatureState = (id: string) => this.GrowthBook.evalFeature(id)
    setUrl = (href: string) => this.GrowthBook.setURL(href)
    isOn = (key: string) => this.GrowthBook.isOn(key)

    init = async () => {
        const _this = this
        await this.GrowthBook.init({ timeout: 2000, streaming: true })
            .then(() => {
                _this.isLoaded = true
            })
            .catch(err => {
                this.error = err
                console.error(err)
            })
    }
}
