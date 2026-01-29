import { defineConfig } from 'tsup'

export default defineConfig([
    // NPM Package Build (ESM + CJS)
    {
        // Entry points - main bundle and optional Growthbook/Posthog/Cache modules
        entry: {
            index: 'src/index.ts',
            'providers/growthbook/index': 'src/providers/growthbook/index.ts',
            'providers/posthog/index': 'src/providers/posthog/index.ts',
            'utils/analytics-cache': 'src/utils/analytics-cache.ts',
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

        // Don't bundle these dependencies (they should be installed by consumers)
        external: ['@rudderstack/analytics-js', 'js-cookie', '@growthbook/growthbook', 'posthog-js'],

        // Target modern browsers and Node
        target: 'es2020',

        // Output directory
        outDir: 'dist',

        // Banner
        esbuildOptions(options) {
            options.banner = {
                js: '/* @deriv-com/analytics - Built with tsup */',
            }
        },
    },

    // Browser Bundle (IIFE/UMD) - For <script> tag usage
    // Includes: RudderStack + PostHog + js-cookie
    // Perfect for: Next.js, React, Webflow, OutSystems scripts
    // Note: GrowthBook is NOT included (optional dependency, requires separate loading)
    {
        entry: {
            'browser/analytics.bundle': 'src/index.ts',
        },

        // IIFE format for browser <script> tags
        format: ['iife'],

        // Global variable name (window.DerivAnalytics)
        globalName: 'DerivAnalytics',

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

        // Banner
        esbuildOptions(options) {
            options.banner = {
                js: '/* @deriv-com/analytics - Browser Bundle (RudderStack + PostHog) - Built with tsup */',
            }
        },
    },
])
