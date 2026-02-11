import { defineConfig } from 'tsup'

export default defineConfig([
    // ========================================
    // NPM Package Build (ESM + CJS)
    // ========================================
    // For use with npm/yarn package managers
    // Supports both CommonJS and ESM imports
    // Tree-shakeable with code-splitting enabled
    {
        // Entry points - main bundle and optional provider/utility modules
        entry: {
            index: 'src/index.ts',
            'providers/growthbook/index': 'src/providers/growthbook.ts',
            'providers/rudderstack/index': 'src/providers/rudderstack.ts',
            'providers/posthog/index': 'src/providers/posthog.ts',
            'utils/analytics-cache/index': 'src/utils/analytics-cache.ts',
        },

        // Output formats for NPM
        format: ['cjs', 'esm'],

        // Generate TypeScript declaration files
        dts: true,

        // Source maps for debugging
        sourcemap: true,

        // Clean dist folder before each build
        clean: true,

        // Minify output for production
        minify: true,

        // Remove unused code
        treeshake: true,

        // Split vendor code for better caching
        splitting: true,

        // Better CommonJS interop (supports both require() and import)
        cjsInterop: true,

        // Add Node.js shims for __dirname, __filename, etc. in ESM
        shims: true,

        // Generate build metadata for bundle analysis
        metafile: true,

        // Don't bundle these dependencies (they should be installed by consumers)
        // Only GrowthBook is external (optional dependency)
        external: ['@growthbook/growthbook'],

        // Target modern browsers and Node
        target: 'es2020',

        // Output directory
        outDir: 'dist',

        // Platform
        platform: 'neutral',

        // Banner
        esbuildOptions(options) {
            options.banner = {
                js: '/* @deriv-com/analytics - NPM Package - Built with tsup */',
            }
        },
    },

    // ========================================
    // Browser Bundle (IIFE) - For <script> tag usage
    // ========================================
    // Single bundled file for direct browser usage
    // Includes: RudderStack + PostHog + js-cookie
    // Perfect for: CDN usage, Webflow, OutSystems, legacy HTML scripts
    // Note: GrowthBook is NOT included (optional dependency)
    {
        entry: {
            'browser/analytics.bundle': 'src/index.ts',
        },

        // IIFE format for browser <script> tags
        format: ['iife'],

        // Global variable name (window.DerivAnalytics)
        globalName: 'DerivAnalytics',

        // Bundle all core dependencies into single file
        bundle: true,
        splitting: false,

        // Bundle core dependencies for standalone browser use
        // GrowthBook excluded (optional) - dynamically imported only when needed
        external: ['@growthbook/growthbook'],
        noExternal: ['@rudderstack/analytics-js', 'js-cookie', 'posthog-js'],

        // Minify for production
        minify: true,

        // Source maps
        sourcemap: true,

        // Target browsers
        target: 'es2020',

        // Output directory
        outDir: 'dist',

        // Platform
        platform: 'browser',

        // Generate build metadata
        metafile: true,

        // Banner
        esbuildOptions(options) {
            options.banner = {
                js: '/* @deriv-com/analytics - Browser IIFE Bundle (RudderStack + PostHog) - Built with tsup */',
            }
        },
    },

    // ========================================
    // Browser ESM Bundle - For modern module bundlers
    // ========================================
    // Modern ESM format with code-splitting support
    // Perfect for: Vite, Webpack 5, Rollup, native ESM in browsers
    // Benefits: Better tree-shaking, smaller bundles, modern tooling support
    {
        entry: {
            'browser/analytics.esm': 'src/index.ts',
        },

        // ESM format for modern bundlers and <script type="module">
        format: ['esm'],

        // Enable code-splitting for better caching
        splitting: true,

        // Bundle core dependencies
        bundle: true,

        // Bundle core dependencies for standalone browser use
        external: ['@growthbook/growthbook'],
        noExternal: ['@rudderstack/analytics-js', 'js-cookie', 'posthog-js'],

        // Minify for production
        minify: true,

        // Source maps
        sourcemap: true,

        // Target modern browsers with ESM support
        target: 'es2020',

        // Output directory
        outDir: 'dist',

        // Platform
        platform: 'browser',

        // Generate build metadata
        metafile: true,

        // Banner
        esbuildOptions(options) {
            options.banner = {
                js: '/* @deriv-com/analytics - Browser ESM Bundle (RudderStack + PostHog) - Built with tsup */',
            }
        },
    },
])
