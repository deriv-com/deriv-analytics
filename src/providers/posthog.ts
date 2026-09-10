import posthog from 'posthog-js'
import type { TPosthogConfig, TPosthogIdentifyTraits, TPosthogOptions } from './posthogTypes'
import { allowedDomains, getPosthogApiHost, posthogUiHost } from '../utils/urls'
import { createLogger, isInternalEmail } from '../utils/helpers'

/**
 * PostHog analytics wrapper with singleton pattern.
 * Provides optional PostHog integration for event tracking and session recording.
 *
 * Features:
 * - Dynamically loads PostHog SDK on demand
 * - Domain allowlisting for security
 * - Automatic user identification with client_id enforcement
 * - client_id backfill for previously identified users via backfillPersonProperties
 * - Custom event tracking with property sanitization
 * - Built-in caching and retry mechanisms (handled by posthog-js library)
 *
 * Note: PostHog handles its own event queuing, caching, and retry logic internally.
 * No additional caching is needed at the wrapper level.
 */
export class Posthog {
    has_initialized = false
    has_identified = false
    private static _instance: Posthog
    // Survives re-instantiation — covers hot reload and multiple module copies.
    // posthog.__loaded is checked as a secondary guard for cases where this
    // static field is reset but posthog-js already has a live instance (e.g.
    // duplicate module bundles in micro-frontends).
    private static _hasLoaded = false
    private static readonly ILLEGAL_IDS = new Set([
        'restored',
        'null',
        'undefined',
        'anonymous',
        'guest',
        'distinctid',
        'distinct_id',
        'id',
        'not_authenticated',
        'email',
        'true',
        'false',
        '0',
        'none',
        'nan',
    ])
    private options: TPosthogOptions
    private debug = false
    private log = createLogger('[PostHog]', () => this.debug)

    constructor(options: TPosthogOptions, debug = false) {
        this.options = options
        this.debug = debug
        this.init()
    }

    /**
     * Get or create the singleton instance of Posthog
     * @param options - PostHog configuration options including API key
     * @param debug - Enable debug logging
     * @returns The Posthog singleton instance
     */
    public static getPosthogInstance = (options: TPosthogOptions, debug = false): Posthog => {
        if (!Posthog._instance) {
            Posthog._instance = new Posthog(options, debug)
        } else if (options.apiKey && options.apiKey !== Posthog._instance.options.apiKey) {
            console.warn('Posthog: getPosthogInstance called with a different API key — returning existing instance')
        }
        return Posthog._instance
    }

    /**
     * Remove stale PostHog cookies that don't belong to the current project key.
     * PostHog sets cookies named `ph_{apiKey}_posthog` — if multiple project keys
     * have been used in the same browser, old cookies pile up and should be cleaned.
     */
    private cleanupStalePosthogCookies = (currentApiKey: string): void => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return

        const currentCookieName = `ph_${currentApiKey}_posthog`
        const staleCookies = document.cookie
            .split(';')
            .map(c => c.trim().split('=')[0] ?? '')
            .filter(name => /^ph_.+_posthog$/.test(name) && name !== currentCookieName)

        if (staleCookies.length === 0) return

        const hostname = window.location.hostname
        const domainParts = hostname.split('.')
        // TLD+2 assumption: works for deriv.com → .deriv.com but would produce
        // .co.uk for app.deriv.co.uk. Acceptable for current Deriv domains.
        const rootDomain = domainParts.length >= 2 ? `.${domainParts.slice(-2).join('.')}` : hostname

        staleCookies.forEach(name => {
            // Try deleting with root domain, subdomain, and no domain
            ;[rootDomain, hostname, ''].forEach(domain => {
                const domainAttr = domain ? `; Domain=${domain}` : ''
                document.cookie = `${name}=; path=/${domainAttr}; max-age=0; SameSite=Lax`
            })
            const deleted = !document.cookie.split(';').some(c => c.trim().startsWith(`${name}=`))
            this.log(`cleanupStalePosthogCookies | ${deleted ? 'removed' : 'failed to remove'} stale cookie: ${name}`)
        })
    }

    /**
     * Initialize PostHog with configuration
     * Configures PostHog instance with provided options
     */
    init = (): void => {
        try {
            const { apiKey, api_host, config = {} } = this.options

            if (!apiKey) {
                console.warn('Posthog: No API key provided')
                return
            }

            if (Posthog._hasLoaded || (posthog as any).__loaded) {
                this.log('init | PostHog already initialized, skipping re-init')
                this.has_initialized = true
                return
            }

            this.cleanupStalePosthogCookies(apiKey)

            const resolvedApiHost = api_host || getPosthogApiHost()
            this.log('init | loading PostHog SDK', { api_host: resolvedApiHost })

            const posthogConfig: TPosthogConfig = {
                // Overridable defaults — consumers can override these via config
                api_host: resolvedApiHost,
                ui_host: posthogUiHost,
                // Scope autocapture to clicks only. Default also captures input changes and
                // form submissions which, on a high-frequency trading SPA, contributes to
                // burst-limit hits.
                autocapture: { dom_event_allowlist: ['click'] },
                // Pin rate limits explicitly so SDK default changes don't silently affect us.
                rate_limiting: {
                    events_per_second: 10,
                    events_burst_limit: 100,
                },
                ...config,

                // ── Enforced after consumer spread ─────────────────────────────────────
                person_profiles: 'identified_only',
                // 'history_change' fires $pageview on every pushState/replaceState (SPA-friendly).
                // Consumers must NOT also call posthog.capture('$pageview') manually — that
                // causes a duplicate on every navigation and hits the burst rate limit.
                capture_pageview: 'history_change',
                capture_pageleave: true,
                session_recording: {
                    ...config.session_recording,
                    recordCrossOriginIframes: true,
                    minimumDurationMilliseconds: 30000,
                    maskAllInputs: true,
                },
                before_send: event => {
                    // SSR guard — note: this drops all server-side events.
                    // If consumers ever use SSR (Next.js, Nuxt), move domain check
                    // to runtime and remove the window guard from the timestamp filter.
                    if (typeof window === 'undefined' || !event) return null

                    if (event.timestamp) {
                        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
                        const eventMs = event.timestamp.getTime()
                        const now = Date.now()
                        if (eventMs < now - sevenDaysMs || eventMs > now + sevenDaysMs) {
                            this.log('init | before_send dropped event with bad timestamp', {
                                event: event.event,
                                timestamp: event.timestamp.toISOString(),
                            })
                            return null
                        }
                    }

                    const currentHost = window.location.hostname
                    if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
                        const isAllowed = allowedDomains.some(
                            domain => currentHost.endsWith(`.${domain}`) || currentHost === domain
                        )
                        if (!isAllowed) {
                            this.log('init | before_send blocked event from disallowed host', { currentHost })
                            return null
                        }
                    }

                    if (config.before_send) {
                        const fns = Array.isArray(config.before_send) ? config.before_send : [config.before_send]
                        let result: typeof event | null = event
                        for (const fn of fns) {
                            result = result ? fn(result) : null
                        }
                        return result
                    }
                    return event
                },
            }

            // Initialize PostHog
            posthog.init(apiKey, posthogConfig)
            if (this.options.app_version) {
                posthog.register({ app_version: this.options.app_version })
            }
            Posthog._hasLoaded = true
            this.has_initialized = true
            this.log('init | PostHog SDK loaded successfully')
        } catch (error) {
            console.error('Posthog: Failed to initialize', error)
        }
    }

    private static isAnonymousId = (id: string | undefined | null): boolean => {
        if (!id) return true
        // Hard-coded UUID v4 pattern — matches posthog-js anonymous ID format.
        // Verify after major posthog-js version bumps; a changed format would treat
        // new anonymous IDs as identified and trigger spurious resets on every login.
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    }

    private resetIfStaleId = (
        currentDistinctId: string | undefined | null,
        nextUserId: string,
        caller: string
    ): void => {
        if (!Posthog.isAnonymousId(currentDistinctId)) {
            this.log(`${caller} | stale identified user, resetting`, {
                previous: currentDistinctId,
                next: nextUserId,
            })
            posthog.reset()
        }
    }

    /**
     * Identify a user with PostHog.
     * Skipped if the user is already identified — use backfillPersonProperties to backfill
     * client_id for users identified in previous sessions.
     *
     * @param user_id - The user ID to identify
     * @param traits - User properties (language, country_of_residence, etc.)
     */
    identifyEvent = (user_id: string, traits: TPosthogIdentifyTraits = {}): void => {
        if (!this.has_initialized) {
            console.warn('Posthog: Cannot identify - not initialized')
            return
        }

        try {
            if (!user_id || !user_id.trim() || Posthog.ILLEGAL_IDS.has(user_id.toLowerCase())) {
                this.log('identifyEvent | skipped — invalid user_id', { user_id })
                return
            }

            const currentDistinctId = posthog.get_distinct_id()

            if (currentDistinctId === user_id) {
                this.log('identifyEvent | skipped — user already identified', { user_id })
                return
            }

            // If PostHog holds a different identified user's ID (not an anonymous UUID),
            // reset first to prevent profile merging between accounts.
            this.resetIfStaleId(currentDistinctId, user_id, 'identifyEvent')

            this.log('identifyEvent | identifying user', { user_id, traits })
            posthog.identify(user_id, {
                ...traits,
                client_id: user_id,
            })
            this.has_identified = true
        } catch (error) {
            console.error('Posthog: Failed to identify user', error)
        }
    }

    /**
     * Reset PostHog state
     * Clears user identification and resets the instance
     */
    reset = (): void => {
        if (!this.has_initialized) return

        try {
            this.log('reset | resetting PostHog session')
            posthog.reset()
            this.has_identified = false
        } catch (error) {
            console.error('Posthog: Failed to reset', error)
        }
    }

    /**
     * Ensure client_id is set in PostHog stored person properties.
     * Call this when the user ID is available and PostHog is loaded.
     * No-op if client_id is already present.
     *
     * @param params.user_id - The user ID to use as client_id
     * @param params.email - The user's email, used to determine is_internal
     * @param params.language - The user's language (BCP 47 tag, e.g. "en-GB")
     * @param params.country_of_residence - The user's country of residence
     */
    backfillPersonProperties = ({
        user_id,
        email,
        language,
        country_of_residence,
    }: {
        user_id: string
        email?: string
        language?: string
        country_of_residence?: string
    }): void => {
        if (!this.has_initialized || !user_id) return

        if (!user_id.trim() || Posthog.ILLEGAL_IDS.has(user_id.toLowerCase())) {
            this.log('backfillPersonProperties | skipped — invalid user_id', { user_id })
            return
        }

        try {
            const currentDistinctId = posthog.get_distinct_id()
            const alreadyIdentified = currentDistinctId === user_id

            // Reset stale identity FIRST — otherwise property reads below see the previous
            // user's cached values and we may early-return without identifying the new user.
            if (!alreadyIdentified) {
                this.resetIfStaleId(currentDistinctId, user_id, 'backfillPersonProperties')
            }

            const updates: Record<string, any> = {}

            // Falsy is correct for string-valued properties; '' is not a valid value and also warrants a rewrite.
            // is_internal uses == null because false is a legitimate value that must not be overwritten.
            if (!posthog.get_property('client_id')) {
                updates.client_id = user_id
            }
            if (email && posthog.get_property('is_internal') == null) {
                updates.is_internal = isInternalEmail(email)
            }
            if (language && !posthog.get_property('language')) {
                updates.language = language
            }
            if (country_of_residence && !posthog.get_property('country_of_residence')) {
                updates.country_of_residence = country_of_residence
            }

            if (alreadyIdentified) {
                if (Object.keys(updates).length === 0) {
                    this.log('backfillPersonProperties | skipped — all properties already present', { user_id })
                    return
                }
                this.log('backfillPersonProperties | backfilling person properties', { user_id, updates })
                posthog.setPersonProperties(updates)
            } else {
                // Always identify after a potential reset — ensures client_id lands even if persistence was cleared.
                if (!updates.client_id) updates.client_id = user_id
                this.log('backfillPersonProperties | user not identified, identifying now', { user_id, updates })
                posthog.identify(user_id, updates)
                this.has_identified = true
            }
        } catch (error) {
            console.error('Posthog: Failed to backfill person properties', error)
        }
    }

    /**
     * Capture a custom event with properties
     * Properties are pre-flattened and cleaned by analytics.ts before being passed here
     *
     * @param event_name - The name of the event to track
     * @param properties - Event properties including core attributes (already flattened and cleaned)
     */
    capture = (event_name: string, properties?: Record<string, any>): void => {
        if (!this.has_initialized) return

        try {
            this.log('capture | sending event to PostHog', { event_name, properties })
            posthog.capture(event_name, properties)
        } catch (error) {
            console.error('Posthog: Failed to capture event', error)
        }
    }

    /**
     * Check whether a feature flag is enabled for the current user.
     *
     * @param key - The feature flag key
     * @returns true/false, or undefined if PostHog is not ready
     */
    isFeatureEnabled = (key: string): boolean | undefined => {
        if (!this.has_initialized) return undefined

        try {
            const result = posthog.isFeatureEnabled(key)
            this.log('isFeatureEnabled', { key, result })
            return result
        } catch (error) {
            console.error('Posthog: Failed to check feature flag', error)
            return undefined
        }
    }

    /**
     * Get the value of a feature flag.
     * Returns a string variant for multivariate flags, true/false for boolean flags,
     * or undefined if the flag does not exist or PostHog is not ready.
     *
     * @param key - The feature flag key
     */
    getFeatureFlag = (key: string): string | boolean | undefined => {
        if (!this.has_initialized) return undefined

        try {
            const result = posthog.getFeatureFlag(key)
            this.log('getFeatureFlag', { key, result })
            return result
        } catch (error) {
            console.error('Posthog: Failed to get feature flag', error)
            return undefined
        }
    }

    /**
     * Get the JSON payload associated with a feature flag.
     * Payloads allow attaching structured metadata (e.g. config objects) to a flag.
     *
     * @param key - The feature flag key
     */
    getFeatureFlagPayload = (
        key: string
    ): string | number | boolean | null | Record<string, unknown> | unknown[] | undefined => {
        if (!this.has_initialized) return undefined

        try {
            const result = posthog.getFeatureFlagResult(key)?.payload as
                string | number | boolean | null | Record<string, unknown> | unknown[] | undefined
            this.log('getFeatureFlagPayload', { key, result })
            return result
        } catch (error) {
            console.error('Posthog: Failed to get feature flag payload', error)
            return undefined
        }
    }

    /**
     * Get all currently active feature flags and their values.
     *
     * @returns A map of flag key → value (boolean or string variant)
     */
    getAllFlags = (): Record<string, string | boolean> => {
        if (!this.has_initialized) return {}

        try {
            // NOTE: featureFlags and getFlagVariants() are internal posthog-js APIs.
            // Verify after major SDK version bumps.
            const raw = posthog.featureFlags?.getFlagVariants() ?? {}
            // FeatureFlagValue includes null/undefined for disabled/unresolved flags;
            // filter them out to honour the declared return type.
            const result = Object.fromEntries(
                Object.entries(raw).filter((entry): entry is [string, string | boolean] => entry[1] != null)
            )
            this.log('getAllFlags', { result })
            return result
        } catch (error) {
            console.error('Posthog: Failed to get all feature flags', error)
            return {}
        }
    }

    /**
     * Subscribe to feature flag changes.
     * The callback fires immediately with the current flags and again whenever they are reloaded.
     *
     * @param callback - Receives the list of active flag keys and a map of key → variant
     * @returns An unsubscribe function — call it to stop listening
     */
    onFeatureFlags = (
        callback: (flags: string[], variants: Record<string, string | boolean>) => void
    ): (() => void) => {
        if (!this.has_initialized) return () => {}

        try {
            this.log('onFeatureFlags | subscribing to feature flag changes')
            const unsubscribe = posthog.onFeatureFlags(callback)
            return typeof unsubscribe === 'function' ? unsubscribe : () => {}
        } catch (error) {
            console.error('Posthog: Failed to subscribe to feature flags', error)
            return () => {}
        }
    }

    /**
     * Force PostHog to reload feature flags from the server.
     * Useful after login, logout, or any attribute change that may affect targeting.
     */
    reloadFeatureFlags = (): void => {
        if (!this.has_initialized) return

        try {
            this.log('reloadFeatureFlags | reloading feature flags')
            posthog.reloadFeatureFlags()
        } catch (error) {
            console.error('Posthog: Failed to reload feature flags', error)
        }
    }
}
