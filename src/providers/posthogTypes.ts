import type { PostHogConfig, SessionRecordingOptions } from 'posthog-js'

/**
 * Extended SessionRecordingOptions to allow additional custom properties
 */
export type TExtendedSessionRecordingOptions = SessionRecordingOptions & {
    minimumDurationMilliseconds?: number
    [key: string]: any // Allow additional custom properties
}

/**
 * Partial version of PostHog configuration to allow flexible initialization
 * All properties from the official PostHogConfig are optional
 * Extends session_recording to support additional properties
 */
export type TPosthogConfig = Partial<Omit<PostHogConfig, 'session_recording'>> & {
    session_recording?: Partial<TExtendedSessionRecordingOptions>
    /**
     * Client-side rate limiting for PostHog event capture.
     * Not yet reflected in posthog-js TypeScript types but supported at runtime.
     * Raise events_burst_limit if legitimate user flows are hitting the limiter.
     */
    rate_limiting?: {
        events_per_second?: number
        events_burst_limit?: number
    }
}

export type TPosthogIdentifyTraits = {
    email?: string
    language?: string
    country_of_residence?: string
    [key: string]: any // Allow additional user properties
}

export type TPosthogOptions = {
    /**
     * PostHog API key
     */
    apiKey: string
    /**
     * Optional PostHog API host URL
     * If not provided, uses the default from utils/urls
     */
    api_host?: string
    /**
     * PostHog configuration options
     * Allows customization of PostHog behavior, session recording, etc.
     */
    config?: TPosthogConfig
    /**
     * App version to attach to all events via posthog.register
     */
    app_version?: string
}
