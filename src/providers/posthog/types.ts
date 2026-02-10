import type { PostHogConfig } from 'posthog-js'
import type { TCoreAttributes } from '../../analytics/types'

export type TPosthogAttributes = Partial<
    Pick<
        TCoreAttributes,
        | 'country'
        | 'user_language'
        | 'device_type'
        | 'account_type'
        | 'residence_country'
        | 'loggedIn'
        | 'user_id'
        | 'anonymous_id'
    >
>

export type TPosthogOptions = {
    apiKey: string // Required: User must provide their Posthog API key
    attributes?: TPosthogAttributes
    enableSessionRecording?: boolean
    enableAutocapture?: boolean
    debug?: boolean
    customConfig?: Partial<PostHogConfig>
}

export type TPosthogEvent = Record<string, any>
