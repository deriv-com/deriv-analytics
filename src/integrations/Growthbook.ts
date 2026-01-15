import { Context, GrowthBook, InitResponse } from '@growthbook/growthbook'
import { RudderAnalytics } from '@rudderstack/analytics-js'
import { TCoreAttributes, TGrowthbookAttributes, TGrowthbookOptions } from '../types/types'

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
    isLoaded = false
    status: void | InitResponse = undefined

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

    reapplyExperiment(url?: string) {
        const currentUrl = url ?? window.location.href
        this.GrowthBook.setURL(currentUrl)
        console.log('Route changed, new URL:', currentUrl)
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
        network_type,
        network_downlink,
        user_id,
        anonymous_id,
        account_mode,
    }: TGrowthbookAttributes) => {
        const CURRENT_ATTRIBUTES = this.GrowthBook.getAttributes()
        this.GrowthBook.setAttributes({
            ...CURRENT_ATTRIBUTES,
            id,
            ...(user_id !== undefined && { user_id }),
            ...(anonymous_id !== undefined && { anonymous_id }),
            ...(country !== undefined && { country }),
            ...(residence_country !== undefined && { residence_country }),
            ...(user_language !== undefined && { user_language }),
            ...(device_language !== undefined && { device_language }),
            ...(device_type !== undefined && { device_type }),
            ...(utm_source !== undefined && { utm_source }),
            ...(utm_medium !== undefined && { utm_medium }),
            ...(utm_campaign !== undefined && { utm_campaign }),
            ...(is_authorised !== undefined && { is_authorised }),
            ...(url !== undefined && { url }),
            ...(domain !== undefined && { domain }),
            ...(utm_content !== undefined && { utm_content }),
            ...(loggedIn !== undefined && { loggedIn }),
            ...(network_type !== undefined && { network_type }),
            ...(network_downlink !== undefined && { network_downlink }),
            ...(account_mode !== undefined && { account_mode }),
        })
    }
    getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(key: K, defaultValue: V) => {
        return this.GrowthBook.getFeatureValue(key as string, defaultValue)
    }
    getStatus = async (): Promise<{ isLoaded: boolean; status: void | InitResponse }> => {
        await this.waitForIsLoaded()

        return {
            isLoaded: this.isLoaded,
            status: this.status,
        }
    }
    getFeatureState = (id: string) => this.GrowthBook.evalFeature(id)
    setUrl = (href: string) => this.GrowthBook.setURL(href)
    isOn = (key: string) => this.GrowthBook.isOn(key)

    init = async () => {
        const status = await this.GrowthBook.init({ timeout: 2000, streaming: true }).catch(err => {
            console.error(err)
        })

        this.status = status
        this.isLoaded = true
    }
}
