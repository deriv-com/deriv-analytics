import type { Context } from '@growthbook/growthbook'
import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import { RudderAnalytics } from '@rudderstack/analytics-js'
import { TCoreAttributes, TEvents } from './types'

type Options = {
    growthbookKey?: string
    growthbookOptions?: Partial<Context>
    growthbookDecryptionKey?: string
    rudderstackKey: string
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        event_cache: Array<{ event: keyof TEvents; payload: TEvents[keyof TEvents] }> = [],
        page_view_cache: Array<{ current_page: string; platform: string; user_id: string }> = []

    const initialise = ({ growthbookKey, growthbookDecryptionKey, rudderstackKey, growthbookOptions }: Options) => {
        try {
            _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
            if (growthbookKey && growthbookDecryptionKey) {
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
            _growthbook.setAttributes({
                id: user_identity || getId(),
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
            })
        }

        core_data = {
            ...core_data,
            ...(geo_location !== undefined && { country }),
            ...(user_language !== undefined && { user_language }),
            ...(account_type !== undefined && { account_type }),
            ...(app_id !== undefined && { app_id }),
            ...(residence_country !== undefined && { residence_country }),
            ...(device_type !== undefined && { device_type }),
            ...(url !== undefined && { url }),
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
        if (navigator.onLine && !_rudderstack) {
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
