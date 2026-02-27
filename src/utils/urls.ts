export const cloudflareTrace = 'https://deriv.com/cdn-cgi/trace'
export const growthbookApi = 'https://cdn.growthbook.io'
export const rudderstackDataplane = 'https://deriv-dataplane.rudderstack.com'
export const posthogApiHost = 'https://ph.deriv.com'
export const posthogUiHost = 'https://us.posthog.com'

export const allowedDomains = ['deriv.com', 'deriv.be', 'deriv.me', 'deriv.team', 'deriv.ae'] as const

export const internalEmailDomains = [
    'deriv.com',
    'derivcrypto.com',
    'besquare.my',
    'besquare.com.my',
    'ewallet.exchange',
    'champion-fx.com',
    'opalstraits.com',
    'binary.com',
    'binary.marketing',
    'championgbs.com',
    '4x.my',
    're-work.dev',
    'regentmarkets.com',
    '4x.com',
    'binary.me',
    'deriv.team',
    'firstsource.io',
    'firstsource.tech',
    'deriv.hr',
    'vmgbpo.net',
    'mailisk.net',
    'mailosaur.net',
    'mobileapps.mailisk.net',
    'w3e180zd.mailosaur.net',
] as const

export const getAllowedDomain = (): string => {
    if (typeof window === 'undefined') return '.deriv.com'
    const hostname = window.location.hostname

    if (hostname === 'localhost') return ''

    const matched = allowedDomains.find(d => hostname.includes(d))
    return matched ? `.${matched}` : '.deriv.com'
}
