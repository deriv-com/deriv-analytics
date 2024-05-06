import type { Context } from '@growthbook/growthbook'
import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
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
        offline_cache: { [key: string]: { event: keyof TEvents; payload: TEvents[keyof TEvents] } } = {}

    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        growthbookOptions,
    }: Options) => {
        _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
        if (growthbookKey && growthbookDecryptionKey) {
            _growthbook = Growthbook.getGrowthBookInstance(growthbookKey, growthbookDecryptionKey, growthbookOptions)

            // Wait for Growthbook initialization to complete
            await new Promise<void>(resolve => {
                let interval = setInterval(() => {
                    if (Object.keys(tracking_config).length > 0) {
                        clearInterval(interval)
                        resolve()
                    } else {
                        tracking_config = getFeatureValue('tracking-buttons-config', {})
                    }
                }, 1000)
            })
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
        url,
    }: TCoreAttributes) => {
        if (!_growthbook && !_rudderstack) return
        const user_identity = user_id ?? getId()

        // Check if we have Growthbook instance
        if (_growthbook) {
            _growthbook.setAttributes({
                id: user_identity || getId(),
                country,
                user_language,
                device_language,
                device_type,
                utm_source,
                utm_medium,
                utm_campaign,
                is_authorised,
                url,
            })
        }

        core_data = {
            ...(user_language !== undefined && { user_language }),
            ...(account_type !== undefined && { account_type }),
            ...(app_id !== undefined && { app_id }),
            ...(device_type !== undefined && { device_type }),
            ...(user_identity !== undefined && { user_identity }),
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
    const getId = () => _rudderstack?.getUserId() || _rudderstack?.getAnonymousId()
    /**
     * Pushes page view event to Rudderstack
     *
     * @param current_page The name or URL of the current page to track the page view event
     * @param platform
     */
    const pageView = (current_page: string, platform = 'Deriv App') => {
        if (!_rudderstack) return

        _rudderstack?.pageView(current_page, platform, getId())
    }

    const identifyEvent = () => {
        if (core_data?.user_identity && _rudderstack) {
            _rudderstack?.identifyEvent(core_data?.user_identity, { language: core_data?.user_language || 'en' })
        }
    }

    const reset = () => {
        if (!_rudderstack) return

        _rudderstack?.reset()
    }

    const trackEvent = <T extends keyof TEvents>(event: T, analytics_data: TEvents[T]) => {
        if (!_rudderstack) return

        if (navigator.onLine) {
            if (Object.keys(offline_cache).length > 0) {
                Object.keys(offline_cache).forEach(cache => {
                    _rudderstack.track(offline_cache[cache].event, offline_cache[cache].payload)
                    delete offline_cache[cache]
                })
            }
            if (event in tracking_config) {
                tracking_config[event] && _rudderstack?.track(event, { ...core_data, ...analytics_data })
            } else _rudderstack?.track(event, { ...core_data, ...analytics_data })
        } else {
            offline_cache[event + analytics_data.action] = { event, payload: { ...core_data, ...analytics_data } }
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
