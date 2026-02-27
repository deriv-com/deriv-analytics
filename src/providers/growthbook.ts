import { GrowthBook, InitResponse } from '@growthbook/growthbook'
import { RudderAnalytics } from '@rudderstack/analytics-js'
import {
    TGrowthbookAttributes,
    TGrowthbookOptions,
    GrowthbookConfigs,
    TGrowthbookCoreAttributes,
} from './growthbookTypes'
import { growthbookApi } from '../utils/urls'
import { createLogger } from '../utils/helpers'

export class Growthbook {
    analytics = new RudderAnalytics()
    GrowthBook: GrowthBook<GrowthbookConfigs>
    private static _instance: Growthbook
    isLoaded = false
    status: void | InitResponse = undefined
    private debug = false
    private log = createLogger('[GrowthBook]', () => this.debug)

    // we have to pass settings due the specific framework implementation
    constructor(clientKey: string, decryptionKey: string, growthbookOptions: TGrowthbookOptions = {}, debug = false) {
        this.debug = debug
        const isLocalhost = typeof window !== 'undefined' ? window.location.hostname.includes('localhost') : false

        this.GrowthBook = new GrowthBook<GrowthbookConfigs>({
            apiHost: growthbookApi,
            clientKey,
            decryptionKey,
            antiFlicker: false,
            navigateDelay: 0,
            antiFlickerTimeout: 3500,
            subscribeToChanges: true,
            enableDevMode: isLocalhost,
            trackingCallback: (experiment, result) => {
                this.log('trackingCallback | experiment viewed', {
                    experiment_id: experiment.key,
                    variation_id: result.variationId,
                })
                if (typeof window !== 'undefined' && window.dataLayer) {
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
        growthbookOptions?: TGrowthbookOptions,
        debug = false
    ) => {
        if (!Growthbook._instance) {
            Growthbook._instance = new Growthbook(clientKey, decryptionKey ?? '', growthbookOptions, debug)
            return Growthbook._instance
        }

        // Warn if trying to reinitialize with different parameters
        if (typeof window !== 'undefined' && console.warn) {
            console.warn('GrowthBook instance already exists. Ignoring new initialization parameters.')
        }

        return Growthbook._instance
    }

    reapplyExperiment(url?: string) {
        const currentUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
        this.GrowthBook.setURL(currentUrl)
    }

    // Utility function to wait for isLoaded to become true
    private waitForIsLoaded(timeout = 10000): Promise<void> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now()
            const checkInterval = setInterval(() => {
                if (this.isLoaded) {
                    clearInterval(checkInterval)
                    resolve()
                } else if (Date.now() - startTime >= timeout) {
                    clearInterval(checkInterval)
                    reject(new Error('GrowthBook initialization timeout'))
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
        const currentAttributes = this.GrowthBook.getAttributes()
        const newAttributes = {
            ...currentAttributes,
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
        }
        this.log('setAttributes | updating GrowthBook attributes', newAttributes)
        this.GrowthBook.setAttributes(newAttributes)
    }
    getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(key: K, defaultValue: V) => {
        const value = this.GrowthBook.getFeatureValue(key as string, defaultValue)
        this.log('getFeatureValue', { key, value, defaultValue })
        return value
    }
    getStatus = async (): Promise<{ isLoaded: boolean; status: void | InitResponse }> => {
        await this.waitForIsLoaded()

        return {
            isLoaded: this.isLoaded,
            status: this.status,
        }
    }
    getFeatureState = (id: string) => {
        const state = this.GrowthBook.evalFeature(id)
        this.log('getFeatureState', { id, result: state })
        return state
    }
    setUrl = (href: string) => {
        this.log('setUrl', { href })
        this.GrowthBook.setURL(href)
    }
    isOn = (key: string) => {
        const result = this.GrowthBook.isOn(key)
        this.log('isOn', { key, result })
        return result
    }

    init = async () => {
        this.log('init | initializing GrowthBook SDK')
        const status = await this.GrowthBook.init({ timeout: 2000, streaming: true }).catch(() => {
            // Silently handle initialization errors
        })

        this.status = status
        this.isLoaded = true
        this.log('init | GrowthBook SDK loaded', { status })
    }

    // Destroy the GrowthBook instance and reset singleton
    destroy = () => {
        this.GrowthBook.destroy()
        this.isLoaded = false
        this.status = undefined
    }

    // Reset the singleton instance (useful for testing)
    public static resetInstance = () => {
        if (Growthbook._instance) {
            Growthbook._instance.destroy()
            Growthbook._instance = undefined as any
        }
    }
}

export type { GrowthbookConfigs, TGrowthbookAttributes, TGrowthbookOptions, TGrowthbookCoreAttributes }
