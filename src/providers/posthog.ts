import posthog from 'posthog-js'
import type { TPosthogConfig, TPosthogIdentifyTraits, TPosthogOptions } from './posthogTypes'
import type { TCoreAttributes } from '../types'
import { allowedDomains, posthogApiHost, posthogUiHost } from '../utils/urls'

/**
 * PostHog analytics wrapper with singleton pattern.
 * Provides optional PostHog integration for event tracking and session recording.
 *
 * Features:
 * - Dynamically loads PostHog SDK on demand
 * - Domain allowlisting for security
 * - Automatic user identification and aliasing
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

    constructor(options: TPosthogOptions) {
        this.options = options
        this.init()
    }

    /**
     * Get or create the singleton instance of Posthog
     * @param options - PostHog configuration options including API key
     * @returns The Posthog singleton instance
     */
    public static getPosthogInstance = (options: TPosthogOptions): Posthog => {
        if (!Posthog._instance) {
            Posthog._instance = new Posthog(options)
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

            const posthogConfig: TPosthogConfig = {
                api_host: api_host || posthogApiHost,
                ui_host: posthogUiHost,
                autocapture: true,
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
                    return isAllowed ? event : null
                },
                ...config,
            }

            // Initialize PostHog
            posthog.init(apiKey, posthogConfig)
            this.has_initialized = true
        } catch (error) {
            console.error('Posthog: Failed to initialize', error)
        }
    }

    /**
     * Identify a user with PostHog
     * Creates an alias between anonymous ID and user ID, then identifies with traits
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
            // Only alias if not already identified
            const isIdentifiedFn = posthog._isIdentified
            const isIdentified = typeof isIdentifiedFn === 'function' ? isIdentifiedFn() : this.has_identified

            if (user_id && !isIdentified) {
                const anonId = posthog.get_distinct_id()
                if (anonId && anonId !== user_id) {
                    posthog.alias(user_id, anonId)
                }
            }

            // Identify with traits
            posthog.identify(user_id, traits)
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
            posthog.reset()
            this.has_identified = false
        } catch (error) {
            console.error('Posthog: Failed to reset', error)
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
            posthog.capture(event_name, properties)
        } catch (error) {
            console.error('Posthog: Failed to capture event', error)
        }
    }
}
