import { isLikelyBot } from '../src/utils/bot-detection'

describe('bot-detection - isLikelyBot', () => {
    const originalNavigator = global.navigator
    const originalWindow = global.window

    beforeEach(() => {
        // Reset navigator and window before each test
        Object.defineProperty(global, 'navigator', {
            writable: true,
            configurable: true,
            value: {
                userAgent: '',
                languages: ['en-US', 'en'],
                webdriver: false,
            },
        })
        Object.defineProperty(global, 'window', {
            writable: true,
            configurable: true,
            value: {
                chrome: {},
            },
        })
    })

    afterEach(() => {
        // Restore original navigator and window
        Object.defineProperty(global, 'navigator', {
            writable: true,
            configurable: true,
            value: originalNavigator,
        })
        Object.defineProperty(global, 'window', {
            writable: true,
            configurable: true,
            value: originalWindow,
        })
    })

    describe('Bot detection by user agent', () => {
        test('should detect bot in user agent', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; bot/1.0)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect crawler in user agent', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; crawler/1.0)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect spider in user agent', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; spider/1.0)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect scraper in user agent', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; scraper/1.0)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect headless browser', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 HeadlessChrome/91.0'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect phantom browser', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Unknown; Linux x86_64) PhantomJS/2.1.1'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect selenium', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (selenium)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect puppeteer', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (puppeteer)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect playwright', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (playwright)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect wget', () => {
            ;(global.navigator as any).userAgent = 'Wget/1.21.1'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect curl', () => {
            ;(global.navigator as any).userAgent = 'curl/7.68.0'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect googlebot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect bingbot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'
            expect(isLikelyBot()).toBe(true)
        })
    })

    describe('Bot detection by webdriver flag', () => {
        test('should detect webdriver flag', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).webdriver = true
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when webdriver is false', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).webdriver = false
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Bot detection by languages', () => {
        test('should detect when languages array is empty', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = []
            expect(isLikelyBot()).toBe(true)
        })

        test('should detect when languages is undefined', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = undefined
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when languages array has items', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Bot detection by Chrome inconsistency', () => {
        test('should detect when user agent has chrome but window.chrome is missing', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = ['en-US']
            ;(global.window as any).chrome = undefined
            expect(isLikelyBot()).toBe(true)
        })

        test('should not detect when user agent has chrome and window.chrome exists', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = ['en-US']
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect when user agent does not have chrome', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/89.0'
            ;(global.navigator as any).languages = ['en-US']
            ;(global.window as any).chrome = undefined
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Real user agents', () => {
        test('should not detect Chrome desktop as bot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.navigator as any).webdriver = false
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Firefox as bot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.navigator as any).webdriver = false
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Safari as bot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.navigator as any).webdriver = false
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect Edge as bot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.navigator as any).webdriver = false
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })

        test('should not detect mobile Chrome as bot', () => {
            ;(global.navigator as any).userAgent =
                'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36'
            ;(global.navigator as any).languages = ['en-US', 'en']
            ;(global.navigator as any).webdriver = false
            ;(global.window as any).chrome = {}
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Edge cases', () => {
        test('should return false when window is undefined', () => {
            const windowBackup = global.window
            ;(global as any).window = undefined
            const result = isLikelyBot()
            ;(global as any).window = windowBackup
            expect(result).toBe(false)
        })

        test('should return false when navigator is undefined', () => {
            const navigatorBackup = global.navigator
            ;(global as any).navigator = undefined
            const result = isLikelyBot()
            ;(global as any).navigator = navigatorBackup
            expect(result).toBe(false)
        })

        test('should handle empty user agent', () => {
            ;(global.navigator as any).userAgent = ''
            ;(global.navigator as any).languages = ['en-US']
            ;(global.navigator as any).webdriver = false
            expect(isLikelyBot()).toBe(false)
        })

        test('should handle null user agent', () => {
            ;(global.navigator as any).userAgent = null
            ;(global.navigator as any).languages = ['en-US']
            ;(global.navigator as any).webdriver = false
            expect(isLikelyBot()).toBe(false)
        })
    })

    describe('Caching behavior', () => {
        test('should cache results for same user agent', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; bot/1.0)'

            const result1 = isLikelyBot()
            const result2 = isLikelyBot()

            expect(result1).toBe(result2)
            expect(result1).toBe(true)
        })

        test('should update cache when user agent changes', () => {
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (compatible; bot/1.0)'
            const result1 = isLikelyBot()
            expect(result1).toBe(true)
            ;(global.navigator as any).userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0'
            ;(global.navigator as any).languages = ['en-US']
            ;(global.window as any).chrome = {}
            const result2 = isLikelyBot()
            expect(result2).toBe(false)
        })
    })
})
