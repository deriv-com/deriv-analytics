import { Growthbook, GrowthbookConfigs } from './growthbook'
import { RudderStack } from './rudderstack'
import { PostHogAnalytics, PostHogConfig } from './posthog'
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
    rudderstackKey?: string
    posthogKey?: string
    posthogHost?: string
    posthogConfig?: PostHogConfig
    growthbookOptions?: TGrowthbookOptions
    disableRudderstackAMD?: boolean
}

type CachedEvent = {
    name: string
    properties: Record<string, unknown>
    timestamp: number
}

type CachedPageView = {
    name: string
    properties?: Record<string, unknown>
    timestamp: number
}

const CACHE_COOKIE_EVENTS = 'cached_analytics_events'
const CACHE_COOKIE_PAGES = 'cached_analytics_page_views'

export function createAnalyticsInstance(options?: Options) {
    let _growthbook: Growthbook,
        _rudderstack: RudderStack,
        _posthog: PostHogAnalytics,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        offline_event_cache: Array<{ event: keyof TAllEvents; payload: TAllEvents[keyof TAllEvents] }> = [],
        _pending_identify_calls: Array<string> = [],
        _cookie_cache_processed = false

    const getAllowedDomain = (): string => {
        const allowedDomains = ['deriv.com', 'deriv.team', 'deriv.ae']
        const hostname = window.location.hostname
        const matched = allowedDomains.find(d => hostname.includes(d))
        return matched ? `.${matched}` : `.${allowedDomains[0]}`
    }

    const processCookieCache = () => {
        if (_cookie_cache_processed) return
        if (!_rudderstack?.has_initialized && !_posthog?.has_initialized) return

        _cookie_cache_processed = true
        const domain = getAllowedDomain()

        try {
            const storedEventsString = Cookies.get(CACHE_COOKIE_EVENTS)
            if (storedEventsString) {
                const storedEvents: CachedEvent[] = JSON.parse(storedEventsString)
                if (Array.isArray(storedEvents) && storedEvents.length > 0) {
                    storedEvents.forEach(event => {
                        _rudderstack?.track(event.name as keyof TAllEvents, event.properties as any)
                        _posthog?.track(event.name as keyof TAllEvents, event.properties as any)
                    })
                    Cookies.remove(CACHE_COOKIE_EVENTS, { domain })
                }
            }

            const storedPagesString = Cookies.get(CACHE_COOKIE_PAGES)
            if (storedPagesString) {
                const storedPages: CachedPageView[] = JSON.parse(storedPagesString)
                if (Array.isArray(storedPages) && storedPages.length > 0) {
                    storedPages.forEach(page => {
                        _rudderstack?.pageView(page.name, 'Deriv App', getId(), page.properties)
                        _posthog?.pageView(page.name, 'Deriv App', getId(), page.properties)
                    })
                    Cookies.remove(CACHE_COOKIE_PAGES, { domain })
                }
            }
        } catch (error) {
            // Silent fail for cache processing
        }
    }

    const cacheEventToCookie = (eventName: string, properties: Record<string, unknown>) => {
        try {
            const domain = getAllowedDomain()
            const existingCache = Cookies.get(CACHE_COOKIE_EVENTS)
            const events: CachedEvent[] = existingCache ? JSON.parse(existingCache) : []
            events.push({ name: eventName, properties, timestamp: Date.now() })
            Cookies.set(CACHE_COOKIE_EVENTS, JSON.stringify(events), { domain, expires: 1 })
        } catch (error) {
            // Silent fail
        }
    }

    const cachePageViewToCookie = (pageName: string, properties?: Record<string, unknown>) => {
        try {
            const domain = getAllowedDomain()
            const existingCache = Cookies.get(CACHE_COOKIE_PAGES)
            const pages: CachedPageView[] = existingCache ? JSON.parse(existingCache) : []
            pages.push({ name: pageName, properties, timestamp: Date.now() })
            Cookies.set(CACHE_COOKIE_PAGES, JSON.stringify(pages), { domain, expires: 1 })
        } catch (error) {
            // Silent fail
        }
    }

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

    const onSdkLoaded = () => {
        processCookieCache()

        _pending_identify_calls.forEach(userId => {
            if (userId) {
                _rudderstack?.identifyEvent(userId, { language: core_data?.user_language || 'en' })
                _posthog?.identifyEvent(userId, { language: core_data?.user_language || 'en' })
            }
        })
        _pending_identify_calls = []
    }

    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        posthogKey,
        posthogHost,
        posthogConfig,
        growthbookOptions,
        disableRudderstackAMD = false,
    }: Options) => {
        try {
            const country = growthbookOptions?.attributes?.country || (await getClientCountry())

            if (rudderstackKey) {
                _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, disableRudderstackAMD, onSdkLoaded)
            }

            if (posthogKey) {
                _posthog = PostHogAnalytics.getPostHogInstance(
                    posthogKey,
                    posthogHost || 'https://ph.deriv.com',
                    disableRudderstackAMD,
                    onSdkLoaded,
                    posthogConfig
                )
            }

            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0) {
                const anonymousId = _rudderstack?.getAnonymousId() || _posthog?.getAnonymousId()
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
                    ...(growthbookOptions?.attributes && { loggedIn: !!growthbookOptions?.attributes?.loggedIn }),
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
                    ...(anonymousId && { anonymous_id: anonymousId }),
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
            const anonId = _rudderstack?.getAnonymousId() || _posthog?.getAnonymousId()
            growthbookOptions.attributes.id ??= anonId
            growthbookOptions.attributes.country ??= country

            if (growthbookKey) {
                _growthbook = Growthbook.getGrowthBookInstance(
                    growthbookKey,
                    growthbookDecryptionKey,
                    growthbookOptions
                )

                const interval = setInterval(() => {
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
        if (!_rudderstack && !_posthog) return

        const user_identity = user_id ?? getId()

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
        const userId = _rudderstack?.getUserId() || _posthog?.getUserId() || ''
        return userId && !isUUID(userId) ? userId : ''
    }

    const getAnonymousId = () => {
        return _rudderstack?.getAnonymousId() || _posthog?.getAnonymousId() || ''
    }

    const pageView = (current_page: string, platform = 'Deriv App', properties?: Record<string, unknown>) => {
        if (!_rudderstack && !_posthog) {
            cachePageViewToCookie(current_page, { platform, ...properties })
            return
        }

        const userId = getId()
        _rudderstack?.pageView(current_page, platform, userId, properties)
        _posthog?.pageView(current_page, platform, userId, properties)
    }

    const identifyEvent = (user_id?: string) => {
        const stored_user_id = user_id || getId()

        if ((_rudderstack?.has_initialized || _posthog?.has_initialized) && stored_user_id) {
            _rudderstack?.identifyEvent(stored_user_id, { language: core_data?.user_language || 'en' })
            _posthog?.identifyEvent(stored_user_id, { language: core_data?.user_language || 'en' })
            return
        }

        if (stored_user_id) {
            _pending_identify_calls.push(stored_user_id)
        }
    }

    const reset = () => {
        _rudderstack?.reset()
        _posthog?.reset()
    }

    const isV2Payload = (payload: any): payload is TV2EventPayload => {
        return 'event_metadata' in payload || 'cta_information' in payload || 'error' in payload
    }

    const trackEvent = <T extends keyof TAllEvents>(event: T, analytics_data: TAllEvents[T]) => {
        const userId = getId()
        let final_payload: any = {}

        if (isV2Payload(analytics_data)) {
            const v2_data = analytics_data as TV2EventPayload
            final_payload = {
                ...v2_data,
                event_metadata: {
                    ...core_data,
                    ...(userId && { user_id: userId }),
                    ...v2_data.event_metadata,
                },
            }
        } else {
            final_payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && { user_id: userId }),
            }
        }

        const hasInitializedProvider = _rudderstack?.has_initialized || _posthog?.has_initialized

        if (!navigator.onLine || !hasInitializedProvider) {
            if (!hasInitializedProvider) {
                cacheEventToCookie(event as string, final_payload)
            } else {
                offline_event_cache.push({ event, payload: final_payload })
            }
            return
        }

        if (offline_event_cache.length > 0) {
            offline_event_cache.forEach(cache => {
                _rudderstack?.track(cache.event, cache.payload)
                _posthog?.track(cache.event, cache.payload)
            })
            offline_event_cache = []
        }

        const shouldTrack = !(event in tracking_config) || tracking_config[event as string]
        if (shouldTrack) {
            _rudderstack?.track(event, final_payload)
            _posthog?.track(event, final_payload)
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
        getAnonymousId,
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
