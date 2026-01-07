import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import { PostHogAnalytics } from './posthog'
import Cookies from 'js-cookie'
import { TCoreAttributes, TGrowthbookAttributes, TGrowthbookOptions, TAllEvents, TV2EventPayload } from './types'
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
    posthogKey: string
    posthogHost?: string
    growthbookOptions?: TGrowthbookOptions
    disableRudderstackAMD?: boolean
}

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack,
        _posthog: PostHogAnalytics,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        event_cache: Array<{ event: keyof TAllEvents; payload: TAllEvents[keyof TAllEvents] }> = [],
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
        posthogKey,
        posthogHost,
        growthbookOptions,
        disableRudderstackAMD = false,
    }: Options) => {
        try {
            const country = growthbookOptions?.attributes?.country || (await getClientCountry())

            // Initialize RudderStack
            _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, disableRudderstackAMD, () => {
                _pending_identify_calls.forEach(userId => {
                    if (userId) {
                        _rudderstack?.identifyEvent(userId, {
                            language: core_data?.user_language || 'en',
                        })
                        // Also identify in PostHog if initialized
                        if (_posthog?.has_initialized) {
                            _posthog?.identifyEvent(userId, {
                                language: core_data?.user_language || 'en',
                            })
                        }
                    }
                })
                _pending_identify_calls = []
            })

            // Initialize PostHog
            _posthog = PostHogAnalytics.getPostHogInstance(
                posthogKey,
                posthogHost || 'https://ph.deriv.com',
                disableRudderstackAMD,
                () => {
                    _pending_identify_calls.forEach(userId => {
                        if (userId) {
                            _posthog?.identifyEvent(userId, {
                                language: core_data?.user_language || 'en',
                            })
                        }
                    })
                }
            )

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
                    if (Object.keys(tracking_config).length > 0) clearInterval(interval)
                    else tracking_config = getFeatureValue('tracking-buttons-config', {}) as { [key: string]: boolean }
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
     * Pushes page view event to RudderStack and PostHog
     *
     * @param current_page The name or URL of the current page to track the page view event
     */
    const pageView = (current_page: string, platform = 'Deriv App', properties?: {}) => {
        if (!_rudderstack) return

        const userId = getId()

        // Send to RudderStack
        _rudderstack?.pageView(current_page, platform, userId, properties)

        // Send to PostHog
        _posthog?.pageView(current_page, platform, userId, properties)
    }

    const identifyEvent = (user_id?: string) => {
        const stored_user_id = user_id || getId()

        if ((_rudderstack?.has_initialized || _posthog?.has_initialized) && stored_user_id) {
            // Identify in RudderStack
            if (_rudderstack?.has_initialized) {
                _rudderstack?.identifyEvent(stored_user_id, {
                    language: core_data?.user_language || 'en',
                })
            }

            // Identify in PostHog
            if (_posthog?.has_initialized) {
                _posthog?.identifyEvent(stored_user_id, {
                    language: core_data?.user_language || 'en',
                })
            }
            return
        }

        if (stored_user_id) {
            _pending_identify_calls.push(stored_user_id)
        }
    }

    const reset = () => {
        if (!_rudderstack && !_posthog) return

        // Reset RudderStack
        _rudderstack?.reset()

        // Reset PostHog
        _posthog?.reset()
    }

    const isV2Payload = (payload: any): payload is TV2EventPayload => {
        return 'event_metadata' in payload || 'cta_information' in payload || 'error' in payload
    }

    const trackEvent = <T extends keyof TAllEvents>(event: T, analytics_data: TAllEvents[T]) => {
        const userId = getId()
        let final_payload: any = {}

        if (isV2Payload(analytics_data)) {
            // --- V2 LOGIC: Nest Core Data ---
            const v2_data = analytics_data as TV2EventPayload
            final_payload = {
                ...v2_data,
                event_metadata: {
                    // 1. Inject Global Core Data
                    ...core_data,
                    // 2. Inject User ID if present
                    ...(userId && { user_id: userId }),
                    // 3. Merge/Overwrite with specific metadata passed in the call
                    ...v2_data.event_metadata,
                },
            }
        } else {
            // --- V1 LOGIC: Flatten Core Data (Backward Compatible) ---
            final_payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && { user_id: userId }),
            }
        }

        if (navigator.onLine && (_rudderstack || _posthog)) {
            if (event_cache.length > 0) {
                event_cache.forEach((cache, index) => {
                    // Send cached events to both providers
                    _rudderstack?.track(cache.event, cache.payload)
                    _posthog?.track(cache.event, cache.payload)
                    delete event_cache[index]
                })
            }

            if (event in tracking_config) {
                if (tracking_config[event as string]) {
                    // Send to both RudderStack and PostHog
                    _rudderstack?.track(event, final_payload)
                    _posthog?.track(event, final_payload)
                }
            } else {
                // Send to both RudderStack and PostHog
                _rudderstack?.track(event, final_payload)
                _posthog?.track(event, final_payload)
            }
        } else {
            event_cache.push({ event, payload: final_payload })
        }
    }

    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack, posthog: _posthog })

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
