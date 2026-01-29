// Domain detection for analytics
export const deriv = 'deriv.com'
export const derivMe = 'deriv.me'
export const derivBe = 'deriv.be'
export const derivTeam = 'deriv.team'
export const derivAe = 'deriv.ae'

export const supportedDomains = [deriv, derivBe, derivMe] as const
export const allowedDomains = [deriv, derivTeam, derivAe] as const

export const baseDomain = (typeof window !== 'undefined' &&
    window.location.hostname.split('app.')[1]) as (typeof supportedDomains)[number]
export const domain = supportedDomains.includes(baseDomain) ? baseDomain : deriv

// Cloudflare trace endpoint for country detection
export const cloudflareTrace = `https://${domain}/cdn-cgi/trace`

// GrowthBook API
export const growthbookApi = 'https://cdn.growthbook.io'

// RudderStack dataplane endpoint
export const rudderstackDataplane = 'https://deriv-dataplane.rudderstack.com'

// PostHog endpoints
export const posthogApiHost = 'https://ph.deriv.com'
export const posthogUiHost = 'https://us.posthog.com'
export const posthogAllowedDomains = ['deriv.com', 'deriv.team', 'deriv.ae']
