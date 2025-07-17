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
        event_cache: Array<{ event: keyof TEvents; payload: TEvents[keyof TEvents] }> = [],
        _pending_identify_calls: Array<string> = []

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

            _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, disableRudderstackAMD, () => {
                // Process pending identify calls when RudderStack is loaded
                _pending_identify_calls.forEach(userId => {
                    if (userId && !isUUID(userId)) {
                        _rudderstack?.identifyEvent(userId, {
                            language: core_data?.user_language || 'en',
                        })
                    }
                })
                _pending_identify_calls = []
            })

            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0) {
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
                    ...(growthbookOptions?.attributes?.user_id &&
                        !isUUID(growthbookOptions?.attributes?.user_id) && {
                            user_id: growthbookOptions?.attributes?.user_id,
                        }),
                    ...(growthbookOptions?.attributes && {
                        anonymous_id: _rudderstack.getAnonymousId(),
                    }),
                    ...(growthbookOptions?.attributes?.account_currency && {
                        account_currency: growthbookOptions?.attributes.account_currency,
                    }),
                    ...(growthbookOptions?.attributes?.account_mode && {
                        account_mode: growthbookOptions?.attributes.account_mode,
                    }),
                }
            }
            growthbookOptions ??= {}
            growthbookOptions.attributes ??= {}
            growthbookOptions.attributes.id ??= _rudderstack.getAnonymousId()
            growthbookOptions.attributes.country ??= country

            if (growthbookKey) {
                _growthbook = Growthbook.getGrowthBookInstance(
                    growthbookKey,
                    growthbookDecryptionKey,
                    growthbookOptions
                )

                let interval = setInterval(() => {
                    if (Object.keys(tracking_config).length > 0) {
                        clearInterval(interval)
                    } else {
                        tracking_config = getFeatureValue('tracking-buttons-config', {})
                    }
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
        account_currency,
        account_mode,
    }: TCoreAttributes) => {
        if (!_rudderstack) return

        const user_identity = user_id ?? getId()

        // Check if we have Growthbook instance and update its attributes
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
                ...(user_id && !isUUID(user_id) && { user_id }),
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
            ...(country !== undefined && { country }),
            ...(geo_location !== undefined && { geo_location }),
            ...(user_language !== undefined && { user_language }),
            ...(account_type !== undefined && { account_type }),
            ...(app_id !== undefined && { app_id }),
            ...(residence_country !== undefined && { residence_country }),
            ...(device_type !== undefined && { device_type }),
            ...(url !== undefined && { url }),
            ...(loggedIn !== undefined && { loggedIn }),
            ...(network_downlink !== undefined && { network_downlink }),
            ...(network_rtt !== undefined && { network_rtt }),
            ...(network_type !== undefined && { network_type }),
            ...(user_id !== undefined && !isUUID(user_id) && { user_id }),
            ...(anonymous_id !== undefined && { anonymous_id }),
            ...(account_currency !== undefined && { account_currency }),
            ...(account_mode !== undefined && { account_mode }),
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
    const getId = () => {
        const userId = _rudderstack?.getUserId() || ''
        return userId && !isUUID(userId) ? userId : ''
    }
    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App', properties?: {}) => {
        if (!_rudderstack) return

        const userId = getId()
        _rudderstack?.pageView(current_page, platform, userId, properties)
    }

    const identifyEvent = (user_id?: string) => {
        const stored_user_id = user_id || getId()

        if (_rudderstack?.has_initialized && stored_user_id && !isUUID(stored_user_id)) {
            _rudderstack?.identifyEvent(stored_user_id, {
                language: core_data?.user_language || 'en',
            })
            return
        }

        if (stored_user_id && !isUUID(stored_user_id)) {
            _pending_identify_calls.push(stored_user_id)
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

            const userId = getId()
            const payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && { user_id: userId }),
            }

            if (event in tracking_config) {
                tracking_config[event] && _rudderstack?.track(event, payload)
            } else {
                _rudderstack?.track(event, payload)
            }
        } else {
            const userId = getId()
            const payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && { user_id: userId }),
            }
            event_cache.push({ event, payload })
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

const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}
