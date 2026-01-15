import type { AnalyticsOptions } from '../types/ProvidersTypes'
import type { TCoreAttributes, TGrowthbookAttributes, TAllEvents, TV2EventPayload } from '../types/types'
import type { GrowthbookConfigs } from '../integrations/Growthbook'
import { getClientCountry } from '../utils/helpers'
import { isUUID } from '../utils/uuid'
import { IdentityManager } from './IdentityManager'
import { RudderstackProvider } from '../providers/RudderstackProvider'
import { PosthogProvider } from '../providers/PosthogProvider'
import { GrowthbookProvider } from '../providers/GrowthbookProvider'

declare global {
    interface Window {
        AnalyticsInstance: ReturnType<typeof createAnalyticsInstance>
    }
}

/**
 * Creates an analytics instance with optional providers (RudderStack, PostHog, Growthbook)
 * All providers are tree-shakeable - only loaded if their API keys are provided
 */
export function createAnalyticsInstance(options?: AnalyticsOptions) {
    // Shared identity manager for all providers
    const identityManager = new IdentityManager()

    // Provider instances - only created if keys are provided
    let rudderstackProvider: RudderstackProvider | null = null
    let posthogProvider: PosthogProvider | null = null
    let growthbookProvider: GrowthbookProvider | null = null

    // Core data and state
    let coreData: Partial<TCoreAttributes> = {}
    let trackingConfig: { [key: string]: boolean } = {}
    let eventCache: Array<{ event: keyof TAllEvents; payload: any }> = []
    let pendingIdentifyCalls: Array<string> = []

    /**
     * Process pending identify calls once providers are ready
     */
    const processPendingIdentifies = () => {
        pendingIdentifyCalls.forEach(userId => {
            if (!userId) return

            const identifyPayload = { language: coreData?.user_language || 'en' }

            if (rudderstackProvider?.hasInitialized) {
                rudderstackProvider.getInstance()?.identifyEvent(userId, identifyPayload)
            }

            if (posthogProvider?.hasInitialized) {
                posthogProvider.getInstance()?.identifyEvent(userId, identifyPayload)
            }
        })
        pendingIdentifyCalls = []
    }

    /**
     * Initialize analytics providers based on provided configuration
     */
    const initialise = async ({
        growthbookKey,
        growthbookDecryptionKey,
        rudderstackKey,
        posthogKey,
        posthogHost,
        posthogConfig,
        growthbookOptions,
    }: AnalyticsOptions) => {
        try {
            const country = growthbookOptions?.attributes?.country || (await getClientCountry())

            // Initialize RudderStack (if key provided)
            if (rudderstackKey) {
                rudderstackProvider = new RudderstackProvider(identityManager)
                await rudderstackProvider.initialize(rudderstackKey, processPendingIdentifies)
            }

            // Initialize PostHog (if key provided)
            if (posthogKey) {
                posthogProvider = new PosthogProvider(identityManager)
                await posthogProvider.initialize(
                    posthogKey,
                    posthogHost || 'https://ph.deriv.com',
                    processPendingIdentifies,
                    posthogConfig
                )
            }

            // Build core data from growthbook options
            if (growthbookOptions?.attributes && Object.keys(growthbookOptions.attributes).length > 0) {
                const attrs = growthbookOptions.attributes
                coreData = {
                    country,
                    ...(attrs.user_language && { user_language: attrs.user_language }),
                    ...(attrs.account_type && { account_type: attrs.account_type }),
                    ...(attrs.app_id && { app_id: attrs.app_id }),
                    ...(attrs.residence_country && { residence_country: attrs.residence_country }),
                    ...(attrs.device_type && { device_type: attrs.device_type }),
                    ...(attrs.url && { url: attrs.url }),
                    ...(attrs.loggedIn !== undefined && { loggedIn: !!attrs.loggedIn }),
                    ...(attrs.email_hash && { email_hash: attrs.email_hash }),
                    ...(attrs.network_type && { network_type: attrs.network_type }),
                    ...(attrs.network_rtt && { network_rtt: attrs.network_rtt }),
                    ...(attrs.network_downlink && { network_downlink: attrs.network_downlink }),
                    ...(attrs.user_id && !isUUID(attrs.user_id) && { user_id: attrs.user_id }),
                    anonymous_id: identityManager.getAnonymousId(),
                    ...(attrs.account_currency && { account_currency: attrs.account_currency }),
                    ...(attrs.account_mode && { account_mode: attrs.account_mode }),
                }
            }

            // Initialize Growthbook (if key provided)
            if (growthbookKey) {
                growthbookProvider = new GrowthbookProvider(identityManager)

                growthbookOptions ??= {}
                growthbookOptions.attributes ??= {}
                growthbookOptions.attributes.id ??= identityManager.getAnonymousId()
                growthbookOptions.attributes.country ??= country

                await growthbookProvider.initialize(growthbookKey, growthbookDecryptionKey, growthbookOptions)

                // Poll for tracking config from Growthbook
                const pollTrackingConfig = () => {
                    const config = getFeatureValue('tracking-buttons-config', {}) as { [key: string]: boolean }
                    if (Object.keys(config).length > 0) {
                        trackingConfig = config
                    } else {
                        setTimeout(pollTrackingConfig, 1000)
                    }
                }
                pollTrackingConfig()
            }
        } catch (error) {
            console.error('Error initializing analytics:', error)
        }
    }

    /**
     * Update analytics attributes across all providers
     */
    const setAttributes = (attributes: TCoreAttributes) => {
        if (!rudderstackProvider && !posthogProvider && !growthbookProvider) return

        const userId = attributes.user_id ?? getId()

        // Update Growthbook attributes
        if (growthbookProvider) {
            const gbAttributes: TGrowthbookAttributes = {
                country: attributes.country,
                residence_country: attributes.residence_country,
                user_language: attributes.user_language,
                device_language: attributes.device_language,
                device_type: attributes.device_type,
                utm_source: attributes.utm_source,
                utm_medium: attributes.utm_medium,
                utm_campaign: attributes.utm_campaign,
                is_authorised: attributes.is_authorised,
                url: attributes.url,
                domain: attributes.domain,
                loggedIn: attributes.loggedIn,
                ...(attributes.user_id && !isUUID(attributes.user_id) && { user_id: attributes.user_id }),
                anonymous_id: attributes.anonymous_id,
            }

            if (userId) {
                gbAttributes.id = userId
                gbAttributes.user_id = userId
            }

            growthbookProvider.setAttributes(gbAttributes)
        }

        // Update core data
        coreData = {
            ...coreData,
            ...(attributes.country !== undefined && { country: attributes.country }),
            ...(attributes.geo_location !== undefined && { geo_location: attributes.geo_location }),
            ...(attributes.user_language !== undefined && { user_language: attributes.user_language }),
            ...(attributes.account_type !== undefined && { account_type: attributes.account_type }),
            ...(attributes.app_id !== undefined && { app_id: attributes.app_id }),
            ...(attributes.residence_country !== undefined && { residence_country: attributes.residence_country }),
            ...(attributes.device_type !== undefined && { device_type: attributes.device_type }),
            ...(attributes.url !== undefined && { url: attributes.url }),
            ...(attributes.loggedIn !== undefined && { loggedIn: attributes.loggedIn }),
            ...(attributes.network_downlink !== undefined && { network_downlink: attributes.network_downlink }),
            ...(attributes.network_rtt !== undefined && { network_rtt: attributes.network_rtt }),
            ...(attributes.network_type !== undefined && { network_type: attributes.network_type }),
            ...(attributes.user_id !== undefined && !isUUID(attributes.user_id) && { user_id: attributes.user_id }),
            ...(attributes.anonymous_id !== undefined && { anonymous_id: attributes.anonymous_id }),
            ...(attributes.account_currency !== undefined && { account_currency: attributes.account_currency }),
            ...(attributes.account_mode !== undefined && { account_mode: attributes.account_mode }),
        }
    }

    /**
     * Get authenticated user ID
     */
    const getId = (): string => {
        const userId = rudderstackProvider?.getUserId() || identityManager.getUserId() || ''
        return userId && !isUUID(userId) ? userId : ''
    }

    /**
     * Check if payload is V2 format
     */
    const isV2Payload = (payload: any): payload is TV2EventPayload => {
        return 'event_metadata' in payload || 'cta_information' in payload || 'error' in payload
    }

    /**
     * Track an analytics event
     */
    const trackEvent = <T extends keyof TAllEvents>(event: T, analyticsData: TAllEvents[T]) => {
        const userId = getId()
        let finalPayload: any

        // Build payload based on format
        if (isV2Payload(analyticsData)) {
            const v2Data = analyticsData as TV2EventPayload
            finalPayload = {
                ...v2Data,
                event_metadata: {
                    ...coreData,
                    ...(userId && { user_id: userId }),
                    ...v2Data.event_metadata,
                },
            }
        } else {
            finalPayload = {
                ...coreData,
                ...analyticsData,
                ...(userId && { user_id: userId }),
            }
        }

        const hasProvider = rudderstackProvider || posthogProvider

        if (navigator.onLine && hasProvider) {
            // Flush cached events
            if (eventCache.length > 0) {
                eventCache.forEach(cache => {
                    rudderstackProvider?.getInstance()?.track(cache.event, cache.payload)
                    posthogProvider?.getInstance()?.track(cache.event, cache.payload)
                })
                eventCache = []
            }

            // Check tracking config
            const shouldTrack = !(event in trackingConfig) || trackingConfig[event as string]

            if (shouldTrack) {
                rudderstackProvider?.getInstance()?.track(event, finalPayload)
                posthogProvider?.getInstance()?.track(event, finalPayload)
            }
        } else {
            eventCache.push({ event, payload: finalPayload })
        }
    }

    /**
     * Track page view event
     */
    const pageView = (currentPage: string, platform = 'Deriv App', properties?: {}) => {
        const userId = getId()
        rudderstackProvider?.getInstance()?.pageView(currentPage, platform, userId, properties)
        posthogProvider?.getInstance()?.pageView(currentPage, platform, userId, properties)
    }

    /**
     * Identify user (called after login)
     */
    const identifyEvent = (userId?: string) => {
        const storedUserId = userId || getId()

        if ((rudderstackProvider?.hasInitialized || posthogProvider?.hasInitialized) && storedUserId) {
            const identifyPayload = { language: coreData?.user_language || 'en' }

            if (rudderstackProvider?.hasInitialized) {
                rudderstackProvider.getInstance()?.identifyEvent(storedUserId, identifyPayload)
            }

            if (posthogProvider?.hasInitialized) {
                posthogProvider.getInstance()?.identifyEvent(storedUserId, identifyPayload)
            }

            identityManager.setUserId(storedUserId)
            return
        }

        if (storedUserId) {
            pendingIdentifyCalls.push(storedUserId)
        }
    }

    /**
     * Reset analytics (called on logout)
     */
    const reset = () => {
        if (!rudderstackProvider && !posthogProvider) return

        rudderstackProvider?.getInstance()?.reset()
        posthogProvider?.getInstance()?.reset()
        identityManager.reset()
    }

    // Growthbook methods
    const getFeatureState = (id: string) => growthbookProvider?.getFeatureState(id)
    const getFeatureValue = <K extends keyof GrowthbookConfigs, V extends GrowthbookConfigs[K]>(
        id: K,
        defaultValue: V
    ) => growthbookProvider?.getFeatureValue(id, defaultValue) ?? defaultValue
    const getGrowthbookStatus = async () => await growthbookProvider?.getStatus()
    const isFeatureOn = (key: string) => growthbookProvider?.isOn(key) || false
    const setUrl = (href: string) => growthbookProvider?.setUrl(href)

    /**
     * Get provider instances (for advanced usage)
     */
    const getInstances = () => ({
        ab: growthbookProvider?.getInstance(),
        tracking: rudderstackProvider?.getInstance(),
        posthog: posthogProvider?.getInstance(),
    })

    // Public API - maintains exact same interface as original
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

    // Expose to window for debugging
    if (typeof window !== 'undefined') {
        window.AnalyticsInstance = AnalyticsInstance
    }

    return AnalyticsInstance
}

/**
 * Default analytics instance (backward compatible)
 */
export const Analytics = createAnalyticsInstance()
