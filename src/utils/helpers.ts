import Cookies from 'js-cookie'
import { cloudflareTrace } from './urls'

/**
 * Creates a prefixed logger that only outputs when debug mode is enabled.
 * Pass a getter function so the logger always reads the latest debug state.
 *
 * @param prefix - Optional provider name appended after [ANALYTIC], e.g. '[RudderStack]'
 * @param isDebugEnabled - A function that returns the current debug flag value
 * @returns A log function with the same signature as console.log
 *
 * @example
 * // In a class
 * private log = createLogger('[RudderStack]', () => this.debug)
 *
 * // In a closure
 * const log = createLogger('', () => _debug)
 */
export const createLogger =
    (prefix: string, isDebugEnabled: () => boolean) =>
    (...args: any[]): void => {
        if (isDebugEnabled()) console.log(`[ANALYTIC]${prefix}`, ...args)
    }

export const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

type TraceData = {
    loc?: string
}

let countryPromise: Promise<string> | null = null

/**
 * Fetches the country information based on Cloudflare's trace data or a fallback from cookies.
 * This function attempts to retrieve the country location by first fetching trace data from Cloudflare
 * and then falling back to the location stored in the cookies if the fetch fails.
 *
 * @returns {Promise<string>} A Promise that resolves to a string representing the country code in lowercase.
 *                            Returns an empty string if no country data is available or if an error occurs.
 *
 * @example
 * // Returns the country code in lowercase based on Cloudflare's trace data or cookies.
 * getCountry().then(country => console.log(country));
 */
export const getCountry = async (): Promise<string> => {
    if (countryPromise) return countryPromise

    const cookieCountry = JSON.parse(Cookies.get('website_status') || '{}')?.clients_country

    countryPromise = (async () => {
        try {
            const response = await fetch(cloudflareTrace).catch(() => null)
            if (!response) return cookieCountry || ''

            const text = await response.text().catch(() => '')
            if (!text) return cookieCountry || ''

            const data: TraceData = Object.fromEntries(text.split('\n').map(v => v.split('=', 2)))
            return data.loc?.toLowerCase() || cookieCountry || ''
        } catch {
            return cookieCountry || ''
        }
    })()

    return countryPromise
}

/**
 * Recursively cleans an object by removing undefined, null, empty strings, empty objects, and empty arrays
 * Used to sanitize event properties before sending to analytics providers
 *
 * @param obj - The object to clean
 * @returns The cleaned object, or undefined if the result would be empty
 */
export const cleanObject = (obj: any): any => {
    if (obj == null || typeof obj !== 'object') return obj

    if (Array.isArray(obj)) {
        const cleanedArr = obj.map(cleanObject).filter(v => v !== undefined && v !== null)
        return cleanedArr.length ? cleanedArr : undefined
    }

    const cleaned: Record<string, any> = {}
    Object.entries(obj).forEach(([key, value]) => {
        const v = cleanObject(value)
        if (
            v === undefined ||
            v === null ||
            v === '' ||
            (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) ||
            (Array.isArray(v) && v.length === 0)
        ) {
            return
        }

        cleaned[key] = v
    })

    return Object.keys(cleaned).length ? cleaned : undefined
}

/**
 * Flattens a nested object structure into a single-level object
 * Lifts all nested properties to the top level without prefixing
 *
 * @param obj - The object to flatten
 * @returns A flattened object with all nested properties at the top level
 *
 * @example
 * flattenObject({ action: 'click', event_metadata: { version: 2, user_language: 'en' } })
 * // Returns: { action: 'click', version: 2, user_language: 'en' }
 *
 * flattenObject({ form_name: 'signup', cta_information: { cta_name: 'signup', section_name: 'header' } })
 * // Returns: { form_name: 'signup', cta_name: 'signup', section_name: 'header' }
 */
export const flattenObject = (obj: any): Record<string, any> => {
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj
    }

    const flattened: Record<string, any> = {}

    Object.entries(obj).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Recursively flatten nested objects and merge them at the top level
            Object.assign(flattened, flattenObject(value))
        } else {
            flattened[key] = value
        }
    })

    return flattened
}
