import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import Cookies from 'js-cookie'
import { TCoreAttributes, TEvents, TGrowthbookAttributes, TGrowthbookOptions } from './types'

type Options = {
    growthbookKey?: string
    growthbookDecryptionKey?: string
    rudderstackKey: string
    growthbookOptions?: TGrowthbookOptions
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        event_cache: Array<{ event: keyof TEvents; payload: TEvents[keyof TEvents] }> = [],
        page_view_cache: Array<{ current_page: string; platform: string; user_id: string }> = []

    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        growthbookOptions,
    }: Options) => {
        const response = await fetch('https://www.cloudflare.com/cdn-cgi/trace')
        const text = await response?.text()
        const CloudflareCountry = Object.fromEntries(text.split('\n').map(v => v.split('=', 2))).loc.toLowerCase()
        const websiteStatus = Cookies.get('website_status')
        let parsedStatus
        if (websiteStatus) {
            try {
                parsedStatus = JSON.parse(websiteStatus) // Parse only if it's a valid JSON string
            } catch (e) {
                console.error('Failed to parse cookie: ', e)
            }
        }

        try {
            _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0)
                core_data = {
                    ...core_data,
                    ...(growthbookOptions?.attributes?.country && { country: growthbookOptions?.attributes.country }),
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
                }
            growthbookOptions ??= {}
            growthbookOptions.attributes ??= {}
            growthbookOptions.attributes.id ??= _rudderstack.getAnonymousId()
            growthbookOptions.attributes.country ??=
                Cookies.get('clients_country') || parsedStatus?.clients_country || CloudflareCountry

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
        app_id,
        utm_source,
        utm_medium,
        utm_campaign,
        is_authorised,
        residence_country,
        url,
        domain,
        geo_location,
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
            }
            if (user_identity) config.id = user_identity
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
        }
    }

    const getFeatureState = (id: string) => _growthbook?.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(
        id: K,
        defaultValue: V
    ) => _growthbook?.getFeatureValue(id as string, defaultValue)
    const isFeatureOn = (key: string) => _growthbook?.isOn(key)
    const setUrl = (href: string) => _growthbook?.setUrl(href)
    const getId = () => _rudderstack?.getUserId() || ''
    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App') => {
        if (!navigator.onLine || !_rudderstack) {
            return page_view_cache.push({ current_page, platform, user_id: getId() })
        }
        if (page_view_cache.length > 0) {
            page_view_cache.forEach((cache, index) => {
                _rudderstack?.pageView(cache.current_page, cache.platform, cache.user_id)
                delete page_view_cache[index]
            })
        }
        _rudderstack?.pageView(current_page, platform, getId())
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

    return {
        initialise,
        setAttributes,
        identifyEvent,
        getFeatureState,
        getFeatureValue,
        isFeatureOn,
        setUrl,
        getId,
        trackEvent,
        getInstances,
        pageView,
        reset,
    }
}

export const Analytics = createAnalyticsInstance()
