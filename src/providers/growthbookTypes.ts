import type { Context } from '@growthbook/growthbook'

export type TGrowthbookAttributes = {
    id?: string
    country?: string
    user_language?: string
    device_language?: string
    device_type?: string
    utm_source?: string
    utm_medium?: 'ppc-native' | 'affiliate' | 'common' | string
    utm_campaign?: string
    is_authorised?: boolean
    url?: string
    domain?: string
    utm_content?: string
    residence_country?: string
    loggedIn?: boolean
    network_type?: string
    network_downlink?: number
    user_id?: string
    anonymous_id?: string
    account_mode?: string
}

export type TGrowthbookOptions = Partial<Omit<Context, 'attributes'> & { attributes: TGrowthbookCoreAttributes }>

export type TGrowthbookCoreAttributes = {
    account_type?: string
    user_id?: string
    anonymous_id?: string
    app_id?: string
    user_identity?: string
    residence_country?: string
    geo_location?: string
    email_hash?: string
    network_type?: string
    network_rtt?: number
    network_downlink?: number
    account_currency?: string
} & Partial<TGrowthbookAttributes>

export type GrowthbookConfigs = {
    // feature flags for framework needs
    'tracking-buttons-config': Record<string, boolean>
} & {
    // any feature flags from growthbook
    [key: string]: Record<string, boolean> | string | boolean | []
}
