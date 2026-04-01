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

            this.cleanupStalePosthogCookies(apiKey)

            const resolvedApiHost = api_host || getPosthogApiHost()
            this.log('init | loading PostHog SDK', { api_host: resolvedApiHost })

            const posthogConfig: TPosthogConfig = {
                api_host: resolvedApiHost,
                ui_host: posthogUiHost,
                autocapture: true,
                capture_pageview: 'history_change',
                session_recording: {
                    recordCrossOriginIframes: true,
                    minimumDurationMilliseconds: 30000,
                    ...config.session_recording,
                },
                before_send: event => {
                    if (typeof window === 'undefined') return null

                    const currentHost = window.location.hostname
                    if (currentHost === 'localhost' || currentHost === '127.0.0.1') return event

                    const isAllowed = allowedDomains.some(
                        domain => currentHost.endsWith(`.${domain}`) || currentHost === domain
                    )
                    if (!isAllowed) this.log('init | before_send blocked event from disallowed host', { currentHost })
                    return isAllowed ? event : null
                },
                ...config,
            }

            // Initialize PostHog
            posthog.init(apiKey, posthogConfig)
            this.has_initialized = true
            this.log('init | PostHog SDK loaded successfully')
        } catch (error) {
            console.error('Posthog: Failed to initialize', error)
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
    identifyEvent = (user_id: string, traits: TPosthogIdentifyTraits): void => {
        if (!this.has_initialized) {
            console.warn('Posthog: Cannot identify - not initialized')
            return
        }

        try {
            const isIdentified =
                typeof posthog._isIdentified === 'function' ? posthog._isIdentified() : this.has_identified

            if (user_id && !isIdentified) {
                this.log('identifyEvent | identifying user', { user_id, traits })
                posthog.identify(user_id, {
                    ...traits,
                    client_id: user_id,
                })
                this.has_identified = true
            } else {
                this.log('identifyEvent | skipped — user already identified', { user_id })
            }
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

        try {
            const storedProperties: Record<string, any> = posthog.get_property('$stored_person_properties') ?? {}
            const updates: Record<string, any> = {}

            if (!storedProperties.client_id) {
                updates.client_id = user_id
            }
            if (email && storedProperties.is_internal === undefined) {
                updates.is_internal = isInternalEmail(email)
            }
            if (language && !storedProperties.language) {
                updates.language = language
            }
            if (country_of_residence && !storedProperties.country_of_residence) {
                updates.country_of_residence = country_of_residence
            }

            if (Object.keys(updates).length > 0) {
                this.log('backfillPersonProperties | backfilling person properties', { user_id, updates })
                posthog.setPersonProperties(updates)
            } else {
                this.log('backfillPersonProperties | skipped — all properties already present', {
                    user_id,
                    country_of_residence,
                })
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
}
