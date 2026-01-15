import { generateUUID } from '../utils/uuid'

/**
 * Configuration for identity management
 */
interface IdentityConfig {
    cookieKey?: string
    cookieMaxAgeSeconds?: number
    externalDomains?: string[]
}

/**
 * Manages user identity (anonymous ID and user ID) across all analytics providers.
 * Ensures consistent identity by managing cookies with the same logic as RudderStack.
 */
export class IdentityManager {
    private anonymousId: string = ''
    private userId: string = ''

    private readonly cookieKey: string
    private readonly cookieMaxAgeSeconds: number
    private readonly externalDomains: string[]

    // Default constants matching RudderStack behavior
    private static readonly DEFAULT_COOKIE_KEY = 'rudder_anonymous_id'
    private static readonly DEFAULT_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60 // 2 years
    private static readonly DEFAULT_EXTERNAL_DOMAINS = ['webflow.io']

    constructor(config: IdentityConfig = {}) {
        this.cookieKey = config.cookieKey ?? IdentityManager.DEFAULT_COOKIE_KEY
        this.cookieMaxAgeSeconds = config.cookieMaxAgeSeconds ?? IdentityManager.DEFAULT_COOKIE_MAX_AGE
        this.externalDomains = config.externalDomains ?? IdentityManager.DEFAULT_EXTERNAL_DOMAINS

        // Initialize cookie and restore ID
        this.initializeCookie()
    }

    /**
     * Gets the anonymous ID. Always returns a valid ID after initialization.
     * @returns The anonymous ID
     */
    public getAnonymousId(): string {
        if (!this.anonymousId) {
            this.restoreAnonymousIdFromCookie()
        }
        return this.anonymousId
    }

    /**
     * Sets a new anonymous ID and persists it to cookie.
     * Used when analytics providers generate their own ID that needs to be synced.
     * @param id - The anonymous ID to set
     */
    public setAnonymousId(id: string): void {
        if (!id) {
            console.warn('IdentityManager: Attempted to set empty anonymous ID')
            return
        }

        if (id !== this.anonymousId) {
            this.anonymousId = id
            this.persistCookie(id)
        }
    }

    /**
     * Gets the authenticated user ID.
     * @returns The user ID or empty string if not set
     */
    public getUserId(): string {
        return this.userId
    }

    /**
     * Sets the authenticated user ID (called after user login/identification).
     * @param id - The user ID to set
     */
    public setUserId(id: string): void {
        this.userId = id
    }

    /**
     * Resets user identity on logout.
     * Anonymous ID persists across sessions.
     */
    public reset(): void {
        this.userId = ''
        // Note: Anonymous ID intentionally persists across resets
    }

    /**
     * Initializes the anonymous ID cookie if it doesn't exist.
     * Matches RudderStack's setCookieIfNotExists logic.
     */
    private initializeCookie(): void {
        const existingId = this.readCookieValue()

        if (existingId) {
            this.anonymousId = existingId
        } else {
            const newId = generateUUID()
            this.anonymousId = newId
            this.persistCookie(newId)
        }
    }

    /**
     * Restores the anonymous ID from cookie.
     */
    private restoreAnonymousIdFromCookie(): void {
        const savedId = this.readCookieValue()
        if (savedId) {
            this.anonymousId = savedId
        }
    }

    /**
     * Reads the anonymous ID from document.cookie using regex.
     * Matches RudderStack's getAnonymousId logic.
     * @returns The cookie value or undefined if not found
     */
    private readCookieValue(): string | undefined {
        const regex = new RegExp('(^|;)\\s*' + this.cookieKey + '\\s*=\\s*([^;]+)')
        const match = document.cookie.match(regex)
        return match?.pop()
    }

    /**
     * Persists the anonymous ID to a cookie.
     * Matches RudderStack's cookie setting logic with proper domain handling.
     * @param id - The ID to persist
     */
    private persistCookie(id: string): void {
        const domain = this.getCookieDomain()
        const cookieString = [
            `${this.cookieKey}=${id}`,
            'path=/',
            `Domain=${domain}`,
            `max-age=${this.cookieMaxAgeSeconds}`,
        ].join('; ')

        document.cookie = cookieString
    }

    /**
     * Determines the appropriate cookie domain based on current hostname.
     * Matches RudderStack's domain logic:
     * - External domains (e.g., webflow.io) use full hostname
     * - Internal domains use last two parts (e.g., app.deriv.com → deriv.com)
     * @returns The domain string to use for the cookie
     */
    private getCookieDomain(): string {
        const hostname = window.location.hostname

        // Check if this is an external domain
        const isExternalDomain = this.externalDomains.some(domain => hostname.endsWith(domain))

        if (isExternalDomain) {
            return hostname
        }

        // For internal domains, use last two parts (e.g., "deriv.com")
        const parts = hostname.split('.')
        return parts.slice(-2).join('.')
    }
}
