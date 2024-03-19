import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import { TCoreAttributes, TEvents } from './types'

type Options = {
    growthbookKey?: string
    growthbookDecryptionKey?: string
    rudderstackKey?: string
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack | null,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        offline_cache: { [key: string]: { event: keyof TEvents; payload: TEvents[keyof TEvents] } } = {}

    const initialise = ({ growthbookKey, growthbookDecryptionKey, rudderstackKey }: Options) => {
        // If Rudderstack is disabled in Firebase remote config
        if (!rudderstackKey) {
            // If Rudderstack is already initialized, remove the instance
            if (_rudderstack) _rudderstack = null
        } else {
            // If Rudderstack is enabled in Firebase remote config but its not yet initialized
            if (!_rudderstack) _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey)
        }

        if (growthbookKey && growthbookDecryptionKey) {
            _growthbook = Growthbook.getGrowthBookInstance(growthbookKey, growthbookDecryptionKey)

            let interval = setInterval(() => {
                if (Object.keys(tracking_config).length > 0) clearInterval(interval)
                else tracking_config = getFeatureValue('tracking-buttons-config', {})
            }, 1000)
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
    }: TCoreAttributes) => {
        if (!_growthbook && !_rudderstack) return
        const user_identity = user_id || getId()

        // Check if we have Growthbook instance and initialize only if there is user ID from growthbook or rudderstack
        if (_growthbook && user_identity) {
            _growthbook.setAttributes({
                id: user_identity,
                country,
                user_language,
                device_language,
                device_type,
                utm_source,
                utm_medium,
                utm_campaign,
                is_authorised,
            })
        }

        core_data = {
            ...(user_language !== undefined && { user_language }),
            ...(account_type !== undefined && { account_type }),
            ...(app_id !== undefined && { app_id }),
            ...(device_type !== undefined && { device_type }),
            ...(user_identity !== undefined && { user_identity }),
        }
    }

    const getFeatureState = (id: string) => _growthbook?.getFeatureState(id)?.experimentResult?.name
    const getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(
        id: K,
        defaultValue: V
    ) => _growthbook?.getFeatureValue(id as string, defaultValue)
    const isFeatureOn = (key: string) => _growthbook?.isOn(key)
    const setUrl = (href: string) => _growthbook?.setUrl(href)
    const getId = () => {
        if (!_rudderstack) return

        return _rudderstack.getUserId() || _rudderstack.getAnonymousId()
    }
    /**
     * Pushes page view event to Rudderstack
     *
     * @param curret_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App') => {
        if (!_rudderstack) return

        // Asserts getId() returns string since Rudderstack instance is already checked to be
        const rudderstackId = getId() as string
        _rudderstack.pageView(current_page, platform, rudderstackId)
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
                    if (_rudderstack) _rudderstack.track(offline_cache[cache].event, offline_cache[cache].payload)
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
