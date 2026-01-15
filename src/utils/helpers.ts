import Cookies from 'js-cookie'
import { CountryUtils } from '@deriv-com/utils'

/**
 * Gets the client's country from multiple sources in priority order:
 * 1. Cookie: 'clients_country'
 * 2. Cookie: 'website_status' (parsed JSON)
 * 3. Cloudflare API
 */
export const getClientCountry = async (): Promise<string> => {
    const countryFromCloudflare = await CountryUtils.getCountry()
    const countryFromCookie = Cookies.get('clients_country')

    const websiteStatus = Cookies.get('website_status')
    let countryFromWebsiteStatus = ''

    if (websiteStatus) {
        try {
            countryFromWebsiteStatus = JSON.parse(websiteStatus)?.clients_country || ''
        } catch (e) {
            console.error('Failed to parse website_status cookie:', e)
        }
    }

    return countryFromCookie || countryFromWebsiteStatus || countryFromCloudflare
}
