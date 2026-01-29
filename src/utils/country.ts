import Cookies from 'js-cookie'
import { cloudflareTrace } from './urls'

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
