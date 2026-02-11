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
}

export type TPosthogIdentifyTraits = {
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
     * PostHog API host URL
     * Defaults to the standard PostHog API host if not provided
     */
    api_host?: string
    /**
     * PostHog UI host URL
     * Defaults to the standard PostHog UI host if not provided
     */
    ui_host?: string
    /**
     * PostHog configuration options
     * Allows customization of PostHog behavior, session recording, etc.
     */
    config?: TPosthogConfig
}
