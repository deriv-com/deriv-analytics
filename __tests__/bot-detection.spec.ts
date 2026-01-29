import { isLikelyBot } from '../src/utils/bot-detection'

describe('bot-detection - isLikelyBot', () => {
    // Helper to mock navigator properties since they're read-only
    const mockNavigator = (props: Partial<Navigator>) => {
        Object.keys(props).forEach(key => {
            Object.defineProperty(navigator, key, {
                value: props[key as keyof Navigator],
                writable: true,
                configurable: true,
            })
        })
    }

    beforeEach(() => {
        // Clear the cache by setting a unique user agent and calling isLikelyBot
        // This forces the cache to reset for the next test
        mockNavigator({ userAgent: `test-clear-cache-${Math.random()}` })
        mockNavigator({ languages: ['en'] as any })
        mockNavigator({ webdriver: false as any })
        ;(window as any).chrome = {}
        isLikelyBot() // Call to update cache with non-bot settings
    })

    describe('Bot detection by user agent', () => {
        test('should detect bot in user agent', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; bot/1.0)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect crawler in user agent', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; crawler/1.0)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect spider in user agent', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; spider/1.0)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect scraper in user agent', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; scraper/1.0)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect headless browser', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 HeadlessChrome/91.0' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect phantom browser', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Unknown; Linux x86_64) PhantomJS/2.1.1' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect selenium', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (selenium)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect puppeteer', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (puppeteer)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect playwright', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (playwright)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect wget', () => {
            mockNavigator({ userAgent: 'Wget/1.21.1' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect curl', () => {
            mockNavigator({ userAgent: 'curl/7.68.0' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect googlebot', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect bingbot', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' })
            expect(isLikelyBot()).toBe(true)
        })
    })

    describe('Bot detection by webdriver flag', () => {
        test('should detect webdriver flag', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ webdriver: true as any })
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when webdriver is false', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ webdriver: false as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Bot detection by languages', () => {
        test('should detect when languages array is empty', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: [] as any })
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect when languages is undefined', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: undefined as any })
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when languages array has items', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Bot detection by Chrome inconsistency', () => {
        test('should detect when user agent has chrome but window.chrome is missing', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: ['en-US'] as any })
            ;(window as any).chrome = undefined
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when user agent has chrome and window.chrome exists', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: ['en-US'] as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect when user agent does not have chrome', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/89.0' })
            mockNavigator({ languages: ['en-US'] as any })
            ;(window as any).chrome = undefined
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Real user agents', () => {
        test('should not detect Chrome desktop as bot', () => {
            mockNavigator({
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            mockNavigator({ webdriver: false as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Firefox as bot', () => {
            mockNavigator({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
            })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            mockNavigator({ webdriver: false as any })
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Safari as bot', () => {
            mockNavigator({
                userAgent:
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
            })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            mockNavigator({ webdriver: false as any })
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Edge as bot', () => {
            mockNavigator({
                userAgent:
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
            })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            mockNavigator({ webdriver: false as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect mobile Chrome as bot', () => {
            mockNavigator({
                userAgent:
                    'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
            })
            mockNavigator({ languages: ['en-US', 'en'] as any })
            mockNavigator({ webdriver: false as any })
            ;(window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Edge cases', () => {
        test('should handle empty user agent', () => {
            mockNavigator({ userAgent: '' })
            mockNavigator({ languages: ['en-US'] as any })
            mockNavigator({ webdriver: false as any })
            expect(isLikelyBot()).toBe(false)
        })

        test('should handle null user agent', () => {
            mockNavigator({ userAgent: null as any })
            mockNavigator({ languages: ['en-US'] as any })
            mockNavigator({ webdriver: false as any })
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Caching behavior', () => {
        test('should cache results for same user agent', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; bot/1.0)' })

            const result1 = isLikelyBot()
            const result2 = isLikelyBot()

            expect(result1).toBe(result2)
            expect(result1).toBe(true)
        })

        test('should update cache when user agent changes', () => {
            mockNavigator({ userAgent: 'Mozilla/5.0 (compatible; bot/1.0)' })
            const result1 = isLikelyBot()
            expect(result1).toBe(true)
            mockNavigator({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0' })
            mockNavigator({ languages: ['en-US'] as any })
            ;(window as any).chrome = {}
            const result2 = isLikelyBot()
            expect(result2).toBe(false)
        })
    })
})
