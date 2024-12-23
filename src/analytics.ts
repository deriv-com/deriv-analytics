import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import Cookies from 'js-cookie'
import { TCoreAttributes, TEvents, TGrowthbookAttributes, TGrowthbookOptions } from './types'
import { CountryUtils } from '@deriv-com/utils'

declare global {
    interface Window {
        AnalyticsInstance: ReturnType<typeof createAnalyticsInstance>
    }
}
type Options = {
    growthbookKey?: string
    growthbookDecryptionKey?: string
    rudderstackKey: string
    growthbookOptions?: TGrowthbookOptions
    disableRudderstackAMD?: boolean
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        event_cache: Array<{ event: keyof TEvents; payload: TEvents[keyof TEvents] }> = []

    const getClientCountry = async () => {
        const countryFromCloudflare = await CountryUtils.getCountry()
        const countryFromCookie = Cookies.get('clients_country')

        const websiteStatus = Cookies.get('website_status')
        let countryFromWebsiteStatus = ''

        if (websiteStatus) {
            try {
                countryFromWebsiteStatus = JSON.parse(websiteStatus)?.clients_country || ''
            } catch (e) {
                console.error('Failed to parse cookie: ', e)
            }
        }

        return countryFromCookie || countryFromWebsiteStatus || countryFromCloudflare
    }

    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        growthbookOptions,
        disableRudderstackAMD = false,
    }: Options) => {
        try {
            const country = growthbookOptions?.attributes?.country || (await getClientCountry())
            _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, disableRudderstackAMD)
            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0)
                core_data = {
                    ...core_data,
                    country,
                    ...(growthbookOptions?.attributes?.user_language && {
                        user_language: growthbookOptions?.attributes.user_language,
                    }),
                    ...(growthbookOptions?.attributes?.account_type && {
                        account_type: growthbookOptions?.attributes.account_type,
                    }),
                    ...(growthbookOptions?.attributes?.app_id && { app_id: growthbookOptions?.attributes.app_id }),
                    ...(growthbookOptions?.attributes?.residence_country && {
                        residence_country: growthbookOptions?.attributes?.residence_country,
                    }),
                    ...(growthbookOptions?.attributes?.device_type && {
                        device_type: growthbookOptions?.attributes.device_type,
                    }),
                    ...(growthbookOptions?.attributes?.url && { url: growthbookOptions?.attributes.url }),
                    ...(growthbookOptions?.attributes && {
                        loggedIn: !!growthbookOptions?.attributes?.loggedIn,
                    }),
                    ...(growthbookOptions?.attributes?.email_hash && {
                        email_hash: growthbookOptions?.attributes.email_hash,
                    }),
                    ...(growthbookOptions?.attributes?.network_type && {
                        network_type: growthbookOptions?.attributes.network_type,
                    }),
                    ...(growthbookOptions?.attributes?.network_rtt && {
                        network_rtt: growthbookOptions?.attributes.network_rtt,
                    }),
                    ...(growthbookOptions?.attributes?.network_downlink && {
                        network_downlink: growthbookOptions?.attributes.network_downlink,
                    }),
                }
            growthbookOptions ??= {}
            growthbookOptions.attributes ??= {}
            growthbookOptions.attributes.id ??= _rudderstack.getAnonymousId()
            growthbookOptions.attributes.anonymous_id ??=
                growthbookOptions?.attributes?.anonymous_id || _rudderstack.getAnonymousId()
            growthbookOptions.attributes.user_id ??= growthbookOptions?.attributes?.user_id
            growthbookOptions.attributes.country ??= country

            if (growthbookKey) {
                _growthbook = Growthbook.getGrowthBookInstance(
                    growthbookKey,
                    growthbookDecryptionKey,
                    growthbookOptions
                )

                let interval = setInterval(() => {
                    if (Object.keys(tracking_config).length > 0) clearInterval(interval)
                    else tracking_config = getFeatureValue('tracking-buttons-config', {})
                }, 1000)
            }
        } catch (error) {
            console.log('Error in initializing analytics', error)
        }
    }

    const setAttributes = ({
        country,
        user_language,
        device_language,
        device_type,
        account_type,
        user_id,
        anonymous_id,
        app_id,
        utm_source,
        utm_medium,
        utm_campaign,
        is_authorised,
        residence_country,
        url,
        domain,
        geo_location,
        loggedIn,
        network_downlink,
        network_rtt,
        network_type,
    }: TCoreAttributes) => {
        if (!_growthbook && !_rudderstack) return

        const user_identity = user_id ?? getId()

        // Check if we have Growthbook instance
        if (_growthbook) {
            const config: TGrowthbookAttributes = {
                country,
                residence_country,
                user_language,
                device_language,
                device_type,
                utm_source,
                utm_medium,
                utm_campaign,
                is_authorised,
                url,
                domain,
                loggedIn,
                user_id,
                anonymous_id,
            }
            if (user_identity) {
                config.id = user_identity
                config.user_id = user_identity
            }
            _growthbook.setAttributes(config)
        }

        core_data = {
            ...core_data,
            ...(country && { country }),
            ...(geo_location && { geo_location }),
            ...(user_language && { user_language }),
            ...(account_type && { account_type }),
            ...(app_id && { app_id }),
            ...(residence_country && { residence_country }),
            ...(device_type && { device_type }),
            ...(url && { url }),
            ...(loggedIn && { loggedIn }),
            ...(network_downlink && { network_downlink }),
            ...(network_rtt && { network_rtt }),
            ...(network_type && { network_type }),
            ...(user_id && { user_id }),
            ...(anonymous_id && { anonymous_id }),
        }
    }

    const getFeatureState = (id: string) => _growthbook?.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(
        id: K,
        defaultValue: V
    ) => _growthbook?.getFeatureValue(id as string, defaultValue)
    const getGrowthbookStatus = async () => await _growthbook?.getStatus()
    const isFeatureOn = (key: string) => _growthbook?.isOn(key)
    const setUrl = (href: string) => _growthbook?.setUrl(href)
    const getId = () => _rudderstack?.getUserId() || ''
    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App', properties?: {}) => {
        if (!_rudderstack) return
        _rudderstack?.pageView(current_page, platform, getId(), properties)
    }

    const identifyEvent = (user_id?: string) => {
        const stored_user_id = user_id || getId()

        if (_rudderstack) {
            _rudderstack?.identifyEvent(stored_user_id as string, { language: core_data?.user_language || 'en' })
        }
    }

    const reset = () => {
        if (!_rudderstack) return

        _rudderstack?.reset()
    }

    const trackEvent = <T extends keyof TEvents>(event: T, analytics_data: TEvents[T]) => {
        if (navigator.onLine && _rudderstack) {
            if (event_cache.length > 0) {
                event_cache.forEach((cache, index) => {
                    _rudderstack.track(cache.event, cache.payload)
                    delete event_cache[index]
                })
            }
            if (event in tracking_config) {
                tracking_config[event] && _rudderstack?.track(event, { ...core_data, ...analytics_data })
            } else _rudderstack?.track(event, { ...core_data, ...analytics_data })
        } else {
            event_cache.push({ event, payload: { ...core_data, ...analytics_data } })
        }
    }

    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack })

    const AnalyticsInstance = {
        initialise,
        setAttributes,
        identifyEvent,
        getFeatureState,
        getFeatureValue,
        getGrowthbookStatus,
        isFeatureOn,
        setUrl,
        getId,
        trackEvent,
        getInstances,
        pageView,
        reset,
    }

    if (typeof window !== 'undefined') {
        window.AnalyticsInstance = AnalyticsInstance
    }

    return AnalyticsInstance
}

export const Analytics = createAnalyticsInstance()
