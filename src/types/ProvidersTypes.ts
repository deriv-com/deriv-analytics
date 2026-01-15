import type { PostHogConfig } from '../integrations/Posthog'
import { TGrowthbookOptions } from './types'

export type GrowthbookConfig = {
    growthbookKey: string
    growthbookDecryptionKey?: string
    growthbookOptions?: TGrowthbookOptions
}

export type RudderstackConfig = {
    rudderstackKey: string
}

export type PosthogConfig = {
    posthogKey: string
    posthogHost?: string
    posthogConfig?: PostHogConfig
}

export type AnalyticsOptions = Partial<GrowthbookConfig> & Partial<RudderstackConfig> & Partial<PosthogConfig>
