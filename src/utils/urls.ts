export const cloudflareTrace = 'https://deriv.com/cdn-cgi/trace'
export const growthbookApi = 'https://cdn.growthbook.io'
export const rudderstackDataplane = 'https://deriv-dataplane.rudderstack.com'

export const allowedDomains = ['deriv.com', 'deriv.be', 'deriv.me', 'deriv.team', 'deriv.ae'] as const

export const getAllowedDomain = (): string => {
    if (typeof window === 'undefined') return '.deriv.com'
    const hostname = window.location.hostname

    if (hostname === 'localhost') return ''

    const matched = allowedDomains.find(d => hostname.includes(d))
    return matched ? `.${matched}` : '.deriv.com'
}
