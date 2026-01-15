/**
 * Generates a UUID using the best available method.
 * Prioritizes native crypto.randomUUID(), then crypto.getRandomValues(),
 * and falls back to Math.random() for legacy browsers.
 *
 * @returns A UUID v4 string
 */
export const generateUUID = (): string => {
    // Modern browsers support crypto.randomUUID() (UUID v4)
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    // Fallback for older browsers using crypto.getRandomValues()
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        return generateUUIDWithCrypto()
    }

    // Last resort fallback (should rarely happen in modern browsers)
    console.warn('UUID: crypto API not available, using Math.random() fallback')
    return generateUUIDWithMathRandom()
}

/**
 * Generates a UUID v4 using crypto.getRandomValues()
 * Used as fallback for browsers that don't support crypto.randomUUID()
 *
 * @returns A UUID v4 string
 */
const generateUUIDWithCrypto = (): string => {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is random hex digit and y is one of 8, 9, A, or B
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c => {
        const num = parseInt(c, 10)
        const randomByte = crypto.getRandomValues(new Uint8Array(1))[0]
        return (num ^ (randomByte & (15 >> (num / 4)))).toString(16)
    })
}

/**
 * Generates a UUID-like string using Math.random()
 * Used only as last resort fallback for very old browsers
 * Note: Not cryptographically secure
 *
 * @returns A UUID v4 format string
 */
const generateUUIDWithMathRandom = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Validates if a string is a valid UUID format
 * Supports UUID v1, v4, and v6 formats
 *
 * @param str - The string to validate
 * @returns True if the string is a valid UUID
 */
export const isValidUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-6][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

/**
 * Checks if a string matches UUID v4 format
 * Used to filter out anonymous IDs from user IDs
 */
export const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}
