import { RudderStack } from './providers/rudderstack'
import type { TCoreAttributes, TAllEvents, TV2EventPayload } from './types'
import {
    cacheEventToCookie,
    cachePageViewToCookie,
    getCachedEvents,
    getCachedPageViews,
    clearCachedEvents,
    clearCachedPageViews,
} from './utils/cookie'
import { isUUID, getCountry, cleanObject, flattenObject, createLogger } from './utils/helpers'
import { cacheTrackEvents } from './utils/analytics-cache'

// Optional Growthbook types - only import if using Growthbook
import type { Growthbook, GrowthbookConfigs } from './providers/growthbook'
import type { TGrowthbookAttributes, TGrowthbookOptions } from './providers/growthbookTypes'

// Optional Posthog types - only import if using Posthog
import type { Posthog } from './providers/posthog'
import type { TPosthogIdentifyTraits, TPosthogOptions } from './providers/posthogTypes'

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
    /** PostHog configuration options including API keys and settings */
    posthogOptions?: TPosthogOptions
    /** Enable debug logging — logs all analytics calls prefixed with [ANALYTIC] */
    debug?: boolean
}

/**
 * Creates a unified analytics instance that integrates RudderStack and GrowthBook.
 *
 * This function provides a centralized interface for:
 * - Event tracking across multiple analytics platforms
 * - A/B testing and feature flag management via GrowthBook
 * - Offline event caching with automatic replay
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
 *   growthbookDecryptionKey: 'YOUR_GB_DECRYPT_KEY'
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
    let _debug = _options?.debug ?? false

    const log = createLogger('', () => _debug)

    let _growthbook: Growthbook | undefined,
        _rudderstack: RudderStack,
        _posthog: Posthog | undefined,
        core_data: Partial<TCoreAttributes> = {},
        tracking_config: { [key: string]: boolean } = {},
        offline_event_cache: Array<{ event: keyof TAllEvents; payload: TAllEvents[keyof TAllEvents] }> = [],
        _pending_identify_calls: Array<{ userId: string; traits?: Record<string, any> }> = [],
        _cookie_cache_processed = false

    const processCookieCache = () => {
        if (_cookie_cache_processed) return
        if (!_rudderstack?.has_initialized) return

        _cookie_cache_processed = true

        try {
            const storedEvents = getCachedEvents()
            if (storedEvents.length > 0) {
                log(`processCookieCache | replaying ${storedEvents.length} cached event(s)`, storedEvents)
                storedEvents.forEach(event => {
                    _rudderstack?.track(event.name as keyof TAllEvents, event.properties as any)
                })
                clearCachedEvents()
            }

            const storedPages = getCachedPageViews()
            if (storedPages.length > 0) {
                log(`processCookieCache | replaying ${storedPages.length} cached page view(s)`, storedPages)
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
        log('onSdkLoaded | RudderStack SDK loaded')
        processCookieCache()

        if (_pending_identify_calls.length > 0) {
            log(`onSdkLoaded | flushing ${_pending_identify_calls.length} pending identify call(s)`)
        }
        _pending_identify_calls.forEach(({ userId, traits }) => {
            if (userId) {
                _rudderstack?.identifyEvent(userId, traits)
            }
        })
        _pending_identify_calls = []
    }

    /**
     * Initializes the analytics instance with specified provider configurations.
     * This method should be called before tracking any events.
     *
     * Features:
     * - Lazy-loads providers (GrowthBook, PostHog) only when configured
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
     *   posthogOptions: {
     *     apiKey: 'YOUR_POSTHOG_API_KEY',
     *     config: {
     *       session_recording: {
     *         recordCrossOriginIframes: true,
     *         minimumDurationMilliseconds: 30000
     *       }
     *     }
     *   }
     * });
     * ```
     */
    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        growthbookOptions,
        posthogOptions,
        debug,
    }: Options) => {
        if (debug !== undefined) _debug = debug
        cacheTrackEvents.setDebug(_debug)

        log('initialise | starting analytics initialization', {
            rudderstack: !!rudderstackKey,
            growthbook: !!growthbookKey,
            posthog: !!posthogOptions,
        })

        try {
            // Only fetch country if GrowthBook is enabled and country not provided
            const country = growthbookOptions?.attributes?.country || (growthbookKey ? await getCountry() : undefined)

            if (rudderstackKey) {
                log('initialise | initializing RudderStack')
                _rudderstack = RudderStack.getRudderStackInstance(rudderstackKey, onSdkLoaded, _debug)
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
                log('initialise | initializing GrowthBook')
                // Dynamically import Growthbook only when needed
                const { Growthbook } = await import('./providers/growthbook')
                _growthbook = Growthbook.getGrowthBookInstance(
                    growthbookKey,
                    growthbookDecryptionKey,
                    growthbookOptions,
                    _debug
                )
                log('initialise | GrowthBook initialized')

                const interval = setInterval(() => {
                    if (Object.keys(tracking_config).length > 0) clearInterval(interval)
                    else tracking_config = getFeatureValue('tracking-buttons-config', {}) as { [key: string]: boolean }
                }, 1000)
            }

            if (posthogOptions) {
                log('initialise | initializing PostHog')
                // Dynamically import Posthog only when needed
                const { Posthog } = await import('./providers/posthog')
                _posthog = Posthog.getPosthogInstance(posthogOptions, _debug)
                log('initialise | PostHog initialized')
            }

            log('initialise | analytics initialization complete')
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
        const user_identity = user_id ?? getId()

        log('setAttributes | received attributes', {
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
        })

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
            log('setAttributes | called GrowthBook setAttributes', config)
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

        log('setAttributes | updated core_data', core_data)
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
        const userId = getId()

        log('pageView | called', { current_page, platform, properties, userId })

        // Handle RudderStack pageView independently
        if (_rudderstack) {
            if (_rudderstack.has_initialized) {
                log('pageView | sending page view to RudderStack', { current_page, platform })
                _rudderstack.pageView(current_page, platform, userId, properties)
            } else {
                log('pageView | RudderStack not initialized — caching page view to cookie', { current_page })
                cachePageViewToCookie(current_page, { platform, ...properties })
            }
        }

        // PostHog handles page views automatically via autocapture
        // No need to manually send page views to PostHog
    }

    /**
     * Identifies a user across analytics platforms.
     * This method should be called after user login or when user identity is known.
     *
     * Features:
     * - Queues identify calls if provider not yet initialized
     * - Allows custom traits for each provider or shared traits for both
     * - Identifies user in PostHog if configured
     *
     * @param {string} [user_id] - The user ID to identify. If not provided, uses stored user ID
     * @param {Record<string, any>} [traits] - Optional traits to send to both providers, or provider-specific traits
     *
     * @example
     * ```typescript
     * // Simple identify
     * analytics.identifyEvent('CR123456');
     *
     * // Identify with same traits for both providers
     * analytics.identifyEvent('CR123456', {
     *   language: 'en',
     *   country_of_residence: 'US'
     * });
     *
     * // Identify with provider-specific traits
     * analytics.identifyEvent('CR123456', {
     *   rudderstack: { language: 'en', custom_field: 'value' },
     *   posthog: { language: 'en', country_of_residence: 'US' }
     * });
     * ```
     */
    const identifyEvent = (user_id?: string, traits?: Record<string, any>) => {
        const stored_user_id = user_id || getId()
        if (!stored_user_id) {
            log('identifyEvent | skipped — no user_id available')
            return
        }

        log('identifyEvent | called', { user_id: stored_user_id, traits })

        // Check if traits has provider-specific structure
        const hasProviderStructure = traits?.rudderstack !== undefined || traits?.posthog !== undefined
        const rudderstackTraits = hasProviderStructure ? traits?.rudderstack : traits
        const posthogTraits = hasProviderStructure ? traits?.posthog : traits

        // Handle RudderStack identification independently
        if (_rudderstack) {
            if (_rudderstack.has_initialized) {
                log('identifyEvent | calling RudderStack identify', {
                    user_id: stored_user_id,
                    traits: rudderstackTraits,
                })
                _rudderstack.identifyEvent(stored_user_id, rudderstackTraits)
            } else {
                if (!_pending_identify_calls.some(call => call.userId === stored_user_id)) {
                    log('identifyEvent | RudderStack not initialized — queuing identify call', {
                        user_id: stored_user_id,
                    })
                    _pending_identify_calls.push({ userId: stored_user_id, traits: rudderstackTraits })
                }
            }
        }

        // Handle PostHog identification independently
        if (_posthog?.has_initialized && posthogTraits) {
            log('identifyEvent | calling PostHog identify', { user_id: stored_user_id, traits: posthogTraits })
            _posthog.identifyEvent(stored_user_id, posthogTraits as TPosthogIdentifyTraits)
        }
    }

    const reset = () => {
        log('reset | resetting all providers')
        // Reset each provider independently
        if (_rudderstack?.has_initialized) {
            log('reset | resetting RudderStack')
            _rudderstack.reset()
        }
        if (_posthog?.has_initialized) {
            log('reset | resetting PostHog')
            _posthog.reset()
        }
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
     * - RudderStack: Caches events when offline or not initialized
     * - PostHog: Sends immediately if initialized (has built-in caching)
     * - Respects feature flag configurations
     * - Each provider works independently - one failing won't affect the other
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
        const userId = getId()
        let final_payload: any = {}

        log('trackEvent | called', { event, analytics_data, userId, core_data })

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
            log('trackEvent | built V2 payload', { event, final_payload })
        } else {
            final_payload = {
                ...core_data,
                ...analytics_data,
                ...(userId && !core_data.user_id && { user_id: userId }),
            }
            log('trackEvent | built V1 payload', { event, final_payload })
        }

        const shouldTrack = !(event in tracking_config) || tracking_config[event as string]
        if (!shouldTrack) {
            log('trackEvent | skipped — event disabled by tracking_config', { event })
            return
        }

        // Handle RudderStack independently
        const hasRudderstackInitialized = _rudderstack?.has_initialized
        if (!navigator.onLine || !hasRudderstackInitialized) {
            if (!hasRudderstackInitialized) {
                log('trackEvent | RudderStack not initialized — caching event to cookie', { event })
                cacheEventToCookie(event as string, final_payload)
            } else {
                log('trackEvent | offline — caching event to memory', { event })
                offline_event_cache.push({ event, payload: final_payload })
            }
        } else {
            // Send cached events to RudderStack
            if (offline_event_cache.length > 0) {
                log(`trackEvent | flushing ${offline_event_cache.length} offline cached event(s) to RudderStack`)
                offline_event_cache.forEach(cache => {
                    const cleaned_cache_payload = cleanObject(cache.payload)
                    _rudderstack?.track(cache.event, cleaned_cache_payload)
                })
                offline_event_cache = []
            }

            // Send current event to RudderStack
            const cleaned_payload = cleanObject(final_payload)
            log('trackEvent | sending event to RudderStack', { event, payload: cleaned_payload })
            _rudderstack?.track(event, cleaned_payload)
        }

        // Handle PostHog independently - send immediately if initialized
        if (_posthog?.has_initialized) {
            const flattened_payload = flattenObject(final_payload)
            const cleaned_posthog_payload = cleanObject(flattened_payload)
            log('trackEvent | sending event to PostHog', { event, payload: cleaned_posthog_payload })
            _posthog.capture(event as string, cleaned_posthog_payload)
        }
    }

    /**
     * Ensures client_id is set in PostHog stored person properties.
     * Call this when the user ID is available and PostHog is loaded.
     * Useful for backfilling client_id for users identified in previous sessions.
     * No-op if client_id is already present or PostHog is not initialized.
     *
     * @param user_id - The user ID to use as client_id
     *
     * @example
     * ```typescript
     * if (window.posthog?.__loaded && userId) {
     *     analytics.setClientId(userId)
     * }
     * ```
     */
    const setClientId = (user_id: string, email: string): void => {
        log('setClientId | called', { user_id })
        if (_posthog?.has_initialized) {
            log('setClientId | setting client_id in PostHog', { user_id })
            _posthog.setClientId(user_id, email)
        } else {
            log('setClientId | skipped — PostHog not initialized')
        }
    }

    const getInstances = () => ({ ab: _growthbook, tracking: _rudderstack, posthog: _posthog })

    const AnalyticsInstance = {
        initialise,
        setAttributes,
        identifyEvent,
        setClientId,
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
