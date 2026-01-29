const BOT_PATTERNS = [
    'bot',
    'crawler',
    'spider',
    'scraper',
    'headless',
    'phantom',
    'selenium',
    'puppeteer',
    'playwright',
    'wget',
    'curl',
    'googlebot',
    'bingbot',
] as const

// Cache for memoization
let cachedResult: boolean | null = null
let cachedUserAgent: string | null = null

export const isLikelyBot = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

    const ua = navigator.userAgent?.toLowerCase()?.trim() || ''

    // Return cached result if user agent hasn't changed
    if (cachedUserAgent === ua && cachedResult !== null) {
        return cachedResult
    }

    // Perform detection
    let isBot = false
    if (BOT_PATTERNS.some(pattern => ua.includes(pattern))) isBot = true
    else if ((navigator as any).webdriver === true) isBot = true
    else if (!navigator.languages || navigator.languages.length === 0) isBot = true
    else if (ua.includes('chrome') && !(window as any).chrome) isBot = true

    // Cache result
    cachedUserAgent = ua
    cachedResult = isBot

    return isBot
}
