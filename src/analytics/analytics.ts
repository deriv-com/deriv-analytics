import { RudderStack } from '../providers/rudderstack'
import type { TCoreAttributes, TAllEvents, TV2EventPayload } from './types'
import {
    cacheEventToCookie,
    cachePageViewToCookie,
    getCachedEvents,
    getCachedPageViews,
    clearCachedEvents,
    clearCachedPageViews,
} from '../utils/cookie'
import { isLikelyBot } from '../utils/bot-detection'
import { isUUID } from '../utils/helpers'
import { getCountry } from '../utils/country'

// Optional Growthbook types - only import if using Growthbook
import type { Growthbook, GrowthbookConfigs } from '../providers/growthbook'
import type { TGrowthbookAttributes, TGrowthbookOptions } from '../providers/growthbook/types'

declare global {
    interface Window {
        AnalyticsInstance: ReturnType<typeof createAnalyticsInstance>
    }
}

/**
 * Configuration options for initializing the analytics instance
 */
type Options = {
    /** GrowthBook client API key for A/B testing and feature flags */
    growthbookKey?: string
    /** GrowthBook decryption key for encrypted feature payloads */
    growthbookDecryptionKey?: string
    /** RudderStack write key for event tracking */
    rudderstackKey?: string
    /** Additional configuration options for GrowthBook */
    growthbookOptions?: TGrowthbookOptions
    /** Enable automatic bot detection and filtering. When true, events from bots won't be tracked */
    enableBotFiltering?: boolean
}

/**
 * Creates a unified analytics instance that integrates RudderStack and GrowthBook.
 *
 * This function provides a centralized interface for:
 * - Event tracking across multiple analytics platforms
 * - A/B testing and feature flag management via GrowthBook
 * - Offline event caching with automatic replay
 * - Bot detection and filtering
 *
 * @param {Options} _options - Optional initialization configuration
 * @returns {Object} Analytics instance with methods for tracking, identification, and feature management
 *
 * @example
 * ```typescript
 * const analytics = createAnalyticsInstance();
 *
 * // Initialize with providers
 * await analytics.initialise({
 *   rudderstackKey: 'YOUR_RS_KEY',
 *   growthbookKey: 'YOUR_GB_KEY',
 *   growthbookDecryptionKey: 'YOUR_GB_DECRYPT_KEY',
 *   enableBotFiltering: true
 * });
 *
 * // Set user attributes
 * analytics.setAttributes({
 *   user_id: 'user123',
 *   country: 'US',
 *   user_language: 'en'
 * });
 *
 * // Track events
 * analytics.trackEvent('button_clicked', { button_name: 'signup' });
 *
 * // Track page views
 * analytics.pageView('/dashboard', 'Deriv App');
 * ```
 */
export function createAnalyticsInstance(_options?: Options) {
    let _growthbook: Growthbook | undefined,
        _rudderstack: RudderStack,
        _enableBotFiltering = false,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        offline_event_cache: Array<{ event: keyof TAllEvents; payload: TAllEvents[keyof TAllEvents] }> = [],
        _pending_identify_calls: Array<string> = [],
        _cookie_cache_processed = false

    const processCookieCache = () => {
        if (_cookie_cache_processed) return
        if (!_rudderstack?.has_initialized) return

        _cookie_cache_processed = true

        try {
            const storedEvents = getCachedEvents()
            if (storedEvents.length > 0) {
                storedEvents.forEach(event => {
                    _rudderstack?.track(event.name as keyof TAllEvents, event.properties as any)
                })
                clearCachedEvents()
            }

            const storedPages = getCachedPageViews()
            if (storedPages.length > 0) {
                storedPages.forEach(page => {
                    _rudderstack?.pageView(page.name, 'Deriv App', getId(), page.properties)
                })
                clearCachedPageViews()
            }
        } catch (err) {
            console.warn('Analytics: Failed to process cookie cache', err)
        }
    }

    const onSdkLoaded = () => {
        processCookieCache()

        _pending_identify_calls.forEach(userId => {
            if (userId) {
                _rudderstack?.identifyEvent(userId, { language: core_data?.user_language || 'en' })
            }
        })
        _pending_identify_calls = []
    }

    /**
     * Initializes the analytics instance with specified provider configurations.
     * This method should be called before tracking any events.
     *
     * Features:
     * - Lazy-loads providers (GrowthBook) only when configured
     * - Automatically fetches user's country for GrowthBook targeting
     * - Processes any cached events from previous sessions
     * - Sets up event tracking callback for GrowthBook experiments
     *
     * @param {Options} options - Configuration options for analytics providers
     * @returns {Promise<void>} Resolves when initialization is complete
     *
     * @example
     * ```typescript
     * await analytics.initialise({
     *   rudderstackKey: 'YOUR_RS_KEY',
     *   growthbookKey: 'YOUR_GB_KEY',
     *   growthbookDecryptionKey: 'YOUR_GB_DECRYPT_KEY',
     *   enableBotFiltering: true
     * });
     * ```
     */
    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        growthbookOptions,
        enableBotFiltering = false,
    }: Options) => {
        try {
            _enableBotFiltering = enableBotFiltering
            // Only fetch country if GrowthBook is enabled and country not provided
            const country = growthbookOptions?.attributes?.country || (growthbookKey ? await getCountry() : undefined)

            if (rudderstackKey) {
                _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, onSdkLoaded)
            }

            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0) {
                const attrs = growthbookOptions.attributes
                const anonymousId = _rudderstack?.getAnonymousId()

                core_data = {
                    ...core_data,
                    country,
                    ...(attrs.user_language && { user_language: attrs.user_language }),
                    ...(attrs.account_type && { account_type: attrs.account_type }),
                    ...(attrs.app_id && { app_id: attrs.app_id }),
                    ...(attrs.residence_country && { residence_country: attrs.residence_country }),
                    ...(attrs.device_type && { device_type: attrs.device_type }),
                    ...(attrs.url && { url: attrs.url }),
                    ...(attrs.email_hash && { email_hash: attrs.email_hash }),
                    ...(attrs.network_type && { network_type: attrs.network_type }),
                    ...(attrs.network_rtt && { network_rtt: attrs.network_rtt }),
                    ...(attrs.network_downlink && { network_downlink: attrs.network_downlink }),
                    ...(attrs.account_currency && { account_currency: attrs.account_currency }),
                    ...(attrs.account_mode && { account_mode: attrs.account_mode }),
                    loggedIn: !!attrs.loggedIn,
                    ...(attrs.user_id && !isUUID(attrs.user_id) && { user_id: attrs.user_id }),
                    ...(anonymousId && { anonymous_id: anonymousId }),
                }
            }

            growthbookOptions ??= {}
            growthbookOptions.attributes ??= {}
            const anonId = _rudderstack?.getAnonymousId()
            growthbookOptions.attributes.id ??= anonId
            growthbookOptions.attributes.country ??= country

            if (growthbookKey) {
                // Dynamically import Growthbook only when needed
                const { Growthbook } = await import('../providers/growthbook')
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
        } catch (err) {
            console.warn('Analytics: Failed to initialize', err)
        }
    }

    /**
     * Sets user and context attributes for analytics tracking and targeting.
     * These attributes are automatically included in all subsequent events.
     *
     * Attributes are used for:
     * - Event enrichment (added to all tracked events)
     * - GrowthBook targeting (feature flags and A/B tests)
     * - User segmentation across analytics platforms
     *
     * @param {TCoreAttributes} attributes - User and context attributes
     *
     * @example
     * ```typescript
     * analytics.setAttributes({
     *   user_id: 'CR123456',
     *   country: 'US',
     *   user_language: 'en',
     *   device_type: 'desktop',
     *   account_type: 'real',
     *   loggedIn: true
     * });
     * ```
     */
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

    const getAnonymousId = () => _rudderstack?.getAnonymousId() || ''

    /**
     * Tracks a page view event.
     *
     * Features:
     * - Automatically includes user ID if available
     * - Caches page views when offline or provider not initialized
     * - Respects bot filtering settings
     *
     * @param {string} current_page - The current page URL or path
     * @param {string} [platform='Deriv App'] - The platform name
     * @param {Record<string, unknown>} [properties] - Additional page properties
     *
     * @example
     * ```typescript
     * analytics.pageView('/dashboard');
     * analytics.pageView('/trade', 'Deriv Trader', { section: 'multipliers' });
     * ```
     */
    const pageView = (current_page: string, platform = 'Deriv App', properties?: Record<string, unknown>) => {
        if (_enableBotFiltering && isLikelyBot()) return

        if (!_rudderstack) {
            cachePageViewToCookie(current_page, { platform, ...properties })
            return
        }

        const userId = getId()
        _rudderstack?.pageView(current_page, platform, userId, properties)
    }

    /**
     * Identifies a user across analytics platforms.
     * This method should be called after user login or when user identity is known.
     *
     * Features:
     * - Queues identify calls if provider not yet initialized
     * - Automatically includes user language from core attributes
     *
     * @param {string} [user_id] - The user ID to identify. If not provided, uses stored user ID
     *
     * @example
     * ```typescript
     * analytics.identifyEvent('CR123456');
     * ```
     */
    const identifyEvent = (user_id?: string) => {
        const stored_user_id = user_id || getId()
        if (!stored_user_id) return

        if (_rudderstack?.has_initialized) {
            _rudderstack?.identifyEvent(stored_user_id, { language: core_data?.user_language || 'en' })
        } else {
            if (!_pending_identify_calls.includes(stored_user_id)) {
                _pending_identify_calls.push(stored_user_id)
            }
        }
    }

    const reset = () => {
        _rudderstack?.reset()
    }

    const isV2Payload = (payload: any): payload is TV2EventPayload => {
        return 'event_metadata' in payload || 'cta_information' in payload || 'error' in payload
    }

    /**
     * Tracks a custom event with associated data.
     *
     * Features:
     * - Automatically enriches events with core attributes
     * - Supports both V1 and V2 event payload formats
     * - Caches events when offline or provider not initialized
     * - Respects bot filtering and feature flag configurations
     * - Sends to RudderStack
     *
     * @template T - The event name type from TAllEvents
     * @param {T} event - The event name to track
     * @param {TAllEvents[T]} analytics_data - The event data payload
     *
     * @example
     * ```typescript
     * // Simple event
     * analytics.trackEvent('button_clicked', { button_name: 'signup' });
     *
     * // V2 event with metadata
     * analytics.trackEvent('form_submitted', {
     *   event_metadata: { form_name: 'registration' },
     *   cta_information: { button_text: 'Create Account' }
     * });
     * ```
     */
    const trackEvent = <T extends keyof TAllEvents>(event: T, analytics_data: TAllEvents[T]) => {
        if (_enableBotFiltering && isLikelyBot()) return

        const userId = getId()
        let final_payload: any = {}

        if (isV2Payload(analytics_data)) {
            const v2_data = analytics_data as TV2EventPayload
            final_payload = {
                ...v2_data,
                event_metadata: {
                    ...core_data,
                    ...(userId && !core_data.user_id && { user_id: userId }),
                    ...v2_data.event_metadata,
                },
            }
        } else {
            final_payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && !core_data.user_id && { user_id: userId }),
            }
        }

        const hasInitializedProvider = _rudderstack?.has_initialized

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
            })
            offline_event_cache = []
        }

        const shouldTrack = !(event in tracking_config) || tracking_config[event as string]
        if (shouldTrack) {
            _rudderstack?.track(event, final_payload)
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
