import posthog from 'posthog-js'
import type { TPosthogConfig, TPosthogIdentifyTraits, TPosthogOptions } from './posthogTypes'
import type { TCoreAttributes } from '../types'
import { allowedDomains, posthogApiHost, posthogUiHost } from '../utils/urls'
import { createLogger } from '../utils/helpers'

/**
 * PostHog analytics wrapper with singleton pattern.
 * Provides optional PostHog integration for event tracking and session recording.
 *
 * Features:
 * - Dynamically loads PostHog SDK on demand
 * - Domain allowlisting for security
 * - Automatic user identification with client_id enforcement
 * - client_id backfill for previously identified users via setClientId
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

            this.log('init | loading PostHog SDK', { api_host: api_host || posthogApiHost })

            const posthogConfig: TPosthogConfig = {
                api_host: api_host || posthogApiHost,
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
     * Skipped if the user is already identified — use setClientId to backfill
     * client_id for users identified in previous sessions.
     *
     * @param user_id - The user ID to identify
     * @param traits - User properties (language, country_of_residence, etc.)
     */
    identifyEvent = (user_id: string, traits?: TPosthogIdentifyTraits): void => {
        if (!this.has_initialized) {
            console.warn('Posthog: Cannot identify - not initialized')
            return
        }

        try {
            const isIdentified =
                typeof posthog._isIdentified === 'function' ? posthog._isIdentified() : this.has_identified

            if (user_id && !isIdentified) {
                this.log('identifyEvent | identifying user', { user_id, traits })
                posthog.identify(user_id, { ...traits, client_id: user_id })
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
     * @param user_id - The user ID to use as client_id
     */
    setClientId = (user_id: string): void => {
        if (!this.has_initialized || !user_id) return

        try {
            const storedProperties = posthog.get_property('$stored_person_properties')
            if (!storedProperties?.client_id) {
                this.log('setClientId | backfilling client_id in PostHog person properties', { user_id })
                posthog.setPersonProperties({ client_id: user_id })
            } else {
                this.log('setClientId | skipped — client_id already present', { user_id })
            }
        } catch (error) {
            console.error('Posthog: Failed to set client_id', error)
        }
    }

    /**
     * Capture a custom event with properties
     * Properties are pre-flattened and cleaned by analytics.ts before being passed here
     *
     * @param event_name - The name of the event to track
     * @param properties - Event properties including core attributes (already flattened and cleaned)
     */
    capture = (event_name: string, properties?: Record<string, any> & Partial<TCoreAttributes>): void => {
        if (!this.has_initialized) return

        try {
            this.log('capture | sending event to PostHog', { event_name, properties })
            posthog.capture(event_name, properties)
        } catch (error) {
            console.error('Posthog: Failed to capture event', error)
        }
    }
}
