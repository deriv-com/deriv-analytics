# @deriv-com/analytics

A modern, tree-shakeable analytics library for tracking user events with RudderStack and PostHog. Designed for optimal performance with advanced caching, batching, and offline support.

## Features

- 📊 **Multi-Provider Support**: RudderStack for event tracking and PostHog for analytics & session recording
- 🎄 **Tree-Shakeable**: Only bundle what you use - each provider can be imported independently
- 📡 **Offline-First**: Automatic event caching when offline with replay on reconnection
- ⚡ **Performance Optimized**: Batching, deduplication, and SendBeacon API for fast tracking
- 🔐 **Type-Safe**: Full TypeScript support with discriminated unions for event payloads
- 🔄 **Backward Compatible**: Supports older React, Node.js, and other legacy package versions
- 💾 **Advanced Caching**: Cookie-based and in-memory caching for robust event delivery
- 🎥 **Session Recording**: Built-in PostHog session recording with customizable settings

> **Note**: GrowthBook support is deprecated and will be removed in a future major version. For A/B testing and feature flags, we recommend using PostHog's built-in feature flag capabilities.

## Table of Contents

- [Installation](#installation)
    - [NPM/Yarn](#npmyarn)
    - [Browser (CDN)](#browser-cdn)
- [Quick Start](#quick-start)
- [Framework Integration](#framework-integration)
    - [React](#react-integration)
    - [Next.js](#nextjs-integration)
    - [Vue.js](#vuejs-integration)
    - [Vanilla JavaScript](#vanilla-javascript)
- [Configuration](#configuration)
    - [RudderStack](#rudderstack-configuration)
    - [PostHog](#posthog-configuration)
- [Core API](#core-api)
    - [Initialization](#initialization)
    - [Event Tracking](#event-tracking)
    - [User Identification](#user-identification)
    - [Page Views](#page-views)
    - [User Attributes](#user-attributes)
- [Caching & Offline Support](#caching--offline-support)
- [Debug Mode](#debug-mode)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)
- [Migration Guide](#migration-guide)

## Installation

### NPM/Yarn

```bash
# Using npm
npm install @deriv-com/analytics

# Using yarn
yarn add @deriv-com/analytics

# Using pnpm
pnpm add @deriv-com/analytics
```

**Core dependencies** (`@rudderstack/analytics-js`, `js-cookie`, and `posthog-js`) are installed automatically.

### Browser (CDN)

Use directly in browsers without a build tool:

```html
<!-- Load from jsdelivr CDN -->
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    const { Analytics } = window.DerivAnalytics

    Analytics.initialise({
        rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
        posthogOptions: {
            apiKey: 'YOUR_POSTHOG_KEY',
            config: {
                autocapture: true,
            },
        },
    }).then(() => {
        Analytics.trackEvent('page_view', { page: 'home' })
    })
</script>
```

**Bundle Size**: ~380 KB minified / ~125 KB gzipped (includes RudderStack + PostHog + all dependencies)

## Quick Start

### Basic Usage (RudderStack Only)

```typescript
import { Analytics } from '@deriv-com/analytics'

// Initialize with RudderStack
await Analytics.initialise({
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
})

// Track events
Analytics.trackEvent('ce_virtual_signup_form', {
    action: 'signup_done',
    signup_provider: 'email',
})

// Track page views
Analytics.pageView('/dashboard', 'Deriv App')

// Identify users
Analytics.identifyEvent('CR123456')
```

### Using Both RudderStack and PostHog

```typescript
import { Analytics } from '@deriv-com/analytics'

await Analytics.initialise({
    // RudderStack for event tracking (required)
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',

    // PostHog for analytics and session recording (optional)
    posthogOptions: {
        apiKey: 'phc_YOUR_POSTHOG_KEY',
        allowedDomains: ['deriv.com', 'deriv.team', 'deriv.ae'],
        config: {
            session_recording: {
                recordCrossOriginIframes: true,
                minimumDurationMilliseconds: 30000,
            },
            autocapture: true,
        },
    },
})

// Events are automatically sent to both providers
Analytics.trackEvent('ce_login_form', {
    action: 'login_cta',
    login_provider: 'google',
})

// User identification syncs with both providers
// When using PostHog, pass email via provider-specific traits (see User Identification section)
Analytics.identifyEvent('CR123456', {
    rudderstack: { language: 'en', country_of_residence: 'US' },
    posthog: { email: 'user@example.com', language: 'en', country_of_residence: 'US' },
})
```

## Framework Integration

### React Integration

Create an analytics initialization hook:

```typescript
// hooks/useAnalytics.ts
import { useEffect } from 'react'
import { Analytics } from '@deriv-com/analytics'

export function useAnalytics() {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.REACT_APP_RUDDERSTACK_KEY!,
            posthogOptions: {
                apiKey: process.env.REACT_APP_POSTHOG_KEY!,
                config: {
                    autocapture: true,
                },
            },
        })
    }, [])
}

// App.tsx
import { useAnalytics } from './hooks/useAnalytics'

function App() {
    useAnalytics()

    const handleSignup = () => {
        Analytics.trackEvent('ce_virtual_signup_form', {
            action: 'signup_modal_open',
            form_source: 'header_cta',
        })
    }

    return <button onClick={handleSignup}>Sign Up</button>
}
```

### Next.js Integration

#### App Router (Next.js 13+)

```typescript
// app/providers.tsx
'use client'

import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogOptions: {
                apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
            },
        })
    }, [])

    return <>{children}</>
}

// app/layout.tsx
import { AnalyticsProvider } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                <AnalyticsProvider>{children}</AnalyticsProvider>
            </body>
        </html>
    )
}
```

#### Pages Router (Next.js 12 and below)

```typescript
// pages/_app.tsx
import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogOptions: {
                apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
            },
        })
    }, [])

    return <Component {...pageProps} />
}
```

### Vue.js Integration

```typescript
// main.ts or main.js
import { createApp } from 'vue'
import { Analytics } from '@deriv-com/analytics'
import App from './App.vue'

// Initialize analytics
Analytics.initialise({
    rudderstackKey: import.meta.env.VITE_RUDDERSTACK_KEY,
    posthogOptions: {
        apiKey: import.meta.env.VITE_POSTHOG_KEY,
    },
})

// Make Analytics available globally
const app = createApp(App)
app.config.globalProperties.$analytics = Analytics
app.mount('#app')

// Usage in components
export default {
    methods: {
        handleClick() {
            this.$analytics.trackEvent('button_clicked', { button_name: 'submit' })
        },
    },
}
```

### Vanilla JavaScript

```html
<!doctype html>
<html>
    <head>
        <script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>
    </head>
    <body>
        <button id="signup-btn">Sign Up</button>

        <script>
            const { Analytics } = window.DerivAnalytics

            // Initialize
            Analytics.initialise({
                rudderstackKey: 'YOUR_KEY',
                posthogOptions: {
                    apiKey: 'YOUR_POSTHOG_KEY',
                },
            })

            // Track button clicks
            document.getElementById('signup-btn').addEventListener('click', () => {
                Analytics.trackEvent('ce_signup_button', {
                    action: 'click',
                    location: 'header',
                })
            })
        </script>
    </body>
</html>
```

## Configuration

### RudderStack Configuration

RudderStack is used for event tracking and includes performance optimizations:

```typescript
await Analytics.initialise({
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
})
```

**Built-in Performance Features:**

- **Event Batching**: Flushes after 10 events or 10 seconds
- **SendBeacon API**: Uses `navigator.sendBeacon` for better performance on page unload
- **Automatic Retry**: Failed requests are automatically retried
- **Cookie Management**: Automatic anonymous ID generation and persistence (2-year cookie lifetime)
- **Offline Support**: Events are cached when offline and replayed when connection is restored

### PostHog Configuration

PostHog provides powerful analytics, session recording, and feature flags:

```typescript
await Analytics.initialise({
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
    posthogOptions: {
        // Required: API key
        apiKey: 'phc_YOUR_KEY',

        // Optional: Domain allowlist for security
        allowedDomains: ['deriv.com', 'deriv.team', 'deriv.ae'],

        // Optional: PostHog configuration
        config: {
            // API endpoints (defaults shown)
            api_host: 'https://ph.deriv.com',
            ui_host: 'https://us.posthog.com',

            // Session recording
            session_recording: {
                recordCrossOriginIframes: true,
                maskAllInputs: false,
                minimumDurationMilliseconds: 30000, // Only save sessions longer than 30 seconds
            },

            // Feature capture
            autocapture: true, // Automatically capture clicks, form submissions, etc.
            capture_pageview: true, // Automatically capture page views
            capture_pageleave: true, // Capture when users leave pages

            // Console log recording (useful for debugging)
            enable_recording_console_log: true,

            // Disable features if needed
            disable_session_recording: false,
            disable_surveys: false,

            // Custom event filtering
            before_send: event => {
                // Custom logic to filter or modify events
                return event
            },
        },
    },
})
```

#### Domain Allowlisting

For security, PostHog can be configured to only send events from specific domains:

```typescript
posthogOptions: {
    apiKey: 'phc_YOUR_KEY',
    allowedDomains: ['deriv.com', 'deriv.team', 'deriv.ae'],
}
```

Events from `app.deriv.com`, `staging.deriv.team`, etc. will be sent. Events from other domains will be blocked.

#### Session Recording Customization

```typescript
posthogOptions: {
    apiKey: 'phc_YOUR_KEY',
    config: {
        session_recording: {
            // Record content from iframes
            recordCrossOriginIframes: true,

            // Mask sensitive input fields
            maskAllInputs: true,
            maskInputOptions: {
                password: true,
                email: true,
            },

            // Only save sessions longer than 1 minute
            minimumDurationMilliseconds: 60000,

            // Sampling (record only 50% of sessions)
            sessionRecordingSampleRate: 0.5,
        },
    },
}
```

## Core API

### Initialization

Initialize the analytics instance before tracking events:

```typescript
await Analytics.initialise({
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
    posthogOptions: {
        apiKey: 'phc_YOUR_POSTHOG_KEY',
        config: {
            autocapture: true,
        },
    },
    debug: false, // Enable to log all analytics calls to the console
})
```

### Event Tracking

Track custom events with associated data. Supports both V1 (flat) and V2 (structured) formats:

#### V1 Event Format (Flat Structure)

```typescript
Analytics.trackEvent('ce_login_form', {
    action: 'login_cta',
    login_provider: 'email',
    form_name: 'main_login',
})
```

#### V2 Event Format (Structured with Metadata)

```typescript
Analytics.trackEvent('ce_get_start_page', {
    action: 'click',
    form_name: 'signup_form',
    cta_information: {
        cta_name: 'get_started',
        section_name: 'hero',
    },
    event_metadata: {
        page_name: '/home',
        user_language: 'en',
    },
})
```

### User Identification

Identify users and sync traits across analytics providers:

#### Simple Identification

```typescript
// Identify user with ID only
Analytics.identifyEvent('CR123456')
```

#### Identification with Custom Traits

```typescript
// Send same traits to both RudderStack and PostHog (no PostHog-specific fields)
Analytics.identifyEvent('CR123456', {
    language: 'en',
    country_of_residence: 'US',
    account_type: 'real',
})

// Send provider-specific traits (recommended when using PostHog)
// PostHog requires `email` to automatically compute the `is_internal` flag
Analytics.identifyEvent('CR123456', {
    rudderstack: {
        language: 'en',
        custom_field: 'value',
    },
    posthog: {
        email: 'user@example.com', // Required for PostHog — used to set is_internal flag
        language: 'en',
        country_of_residence: 'US',
    },
})
```

**How it works:**

- If you pass a simple object (e.g., `{ language: 'en' }`), the same traits are sent to both providers
- If you pass an object with `rudderstack` or `posthog` keys, provider-specific traits are used
- Queues identify calls if provider not yet initialized
- PostHog automatically handles aliasing between anonymous and identified users
- When `email` is provided in PostHog traits, the `is_internal` flag is automatically computed and set as a person property — `email` itself is **not** forwarded to PostHog

### Page Views

Track page navigation:

```typescript
// Basic page view
Analytics.pageView('/dashboard')

// With custom platform name
Analytics.pageView('/dashboard', 'Deriv Trader')

// With additional properties
Analytics.pageView('/trade', 'Deriv App', {
    section: 'multipliers',
    instrument: 'forex',
})
```

**Note**: PostHog automatically captures page views when `capture_pageview: true` is set in config. Manual page view tracking is primarily for RudderStack.

### User Attributes

Set user and context attributes that are automatically included in all events:

```typescript
Analytics.setAttributes({
    country: 'US',
    user_language: 'en',
    account_type: 'real',
    device_type: 'mobile',
    account_currency: 'USD',
    account_mode: 'demo',
    residence_country: 'US',
    loggedIn: true,
})
```

**All subsequent events will include these attributes automatically.**

### Reset User Session

Clear user session from all providers (e.g., on logout):

```typescript
Analytics.reset()
```

## Caching & Offline Support

The package includes robust caching mechanisms to ensure no events are lost:

### Cookie-Based Caching

Events are cached in cookies when:

- **RudderStack SDK hasn't loaded yet** - Events are stored and replayed once the SDK initializes
- **User is offline** - Events are queued and sent when connection is restored

```typescript
// Automatic - no configuration needed
Analytics.trackEvent('button_clicked', { button: 'submit' })
// ↓ If offline or SDK not ready, stored in cookies
// ↓ Automatically sent when online/SDK ready
```

**Technical Details:**

- Cookies have a 7-day expiration
- Maximum 10 cached events (oldest events dropped if exceeded)
- Automatic cleanup after successful replay
- SameSite=Lax for security

### In-Memory Caching

In addition to cookie caching, events are cached in memory when the user is offline but the SDK is initialized:

```typescript
// While offline
Analytics.trackEvent('offline_event', { data: 'cached' })
// ↓ Stored in memory
// ↓ Sent immediately when online

// Check offline status
window.addEventListener('online', () => {
    // Cached events automatically sent
})
```

### Page View Caching

Page views are also cached using the same mechanism:

```typescript
// While SDK is loading
Analytics.pageView('/dashboard')
// ↓ Cached in cookies
// ↓ Replayed once SDK is ready
```

### Advanced Caching Utilities

For complex scenarios requiring more control, use the advanced caching utilities:

```typescript
import { cacheTrackEvents } from '@deriv-com/analytics'

// Track events with automatic caching before SDK loads
cacheTrackEvents.track({
    name: 'ce_login_form',
    properties: { action: 'open' },
})

// Add click event listeners with auto-retry
cacheTrackEvents.addEventHandler([
    {
        element: '.signup-button',
        event: {
            name: 'ce_button_click',
            properties: { button_name: 'signup' },
        },
        cache: true, // Cache if SDK not ready
    },
])

// Track page-specific events
cacheTrackEvents.pageLoadEvent([
    {
        pages: ['dashboard', 'profile'],
        event: {
            name: 'ce_page_load',
            properties: { page_type: 'authenticated' },
        },
    },
])

// Automatic pageview tracking
cacheTrackEvents.pageView()
```

## Debug Mode

Enable verbose logging to trace every analytics call in the browser console:

```typescript
await Analytics.initialise({
    rudderstackKey: 'YOUR_KEY',
    posthogOptions: { apiKey: 'phc_YOUR_KEY' },
    debug: true,
})
```

All logs are prefixed with `[ANALYTIC]` (e.g., `[ANALYTIC][RudderStack] trackEvent | ...`). Useful during development and QA to verify events are firing correctly without opening the network tab.

## Advanced Usage

### Independent Package Usage

Each provider can be used independently for maximum flexibility:

#### PostHog Only

```typescript
import { Posthog } from '@deriv-com/analytics/posthog'

const posthog = Posthog.getPosthogInstance({
    apiKey: 'phc_YOUR_KEY',
    allowedDomains: ['deriv.com'],
    config: {
        autocapture: true,
        session_recording: {
            recordCrossOriginIframes: true,
        },
    },
})

// Track events
posthog.capture('button_clicked', { button_name: 'signup' })

// Identify users — email is required and used to compute is_internal
posthog.identifyEvent('CR123', { email: 'user@example.com', language: 'en' })

// Check feature flags
const isEnabled = posthog.isFeatureEnabled('new-feature')
const variant = posthog.getFeatureFlag('button-color')
```

#### RudderStack Only

```typescript
import { RudderStack } from '@deriv-com/analytics/rudderstack'

const rudderstack = RudderStack.getRudderStackInstance('YOUR_KEY', () => {
    console.log('RudderStack loaded')
})

// Track events
rudderstack.track('button_clicked', { button: 'signup' })

// Identify users
rudderstack.identifyEvent('CR123', { language: 'en' })

// Track page views
rudderstack.pageView('/dashboard', 'Deriv App', 'CR123')
```

### Access Provider Instances

Access raw provider instances for advanced use cases:

```typescript
const { tracking, posthog } = Analytics.getInstances()

// Access PostHog directly
if (posthog?.has_initialized) {
    posthog.capture('custom_event', { property: 'value' })

    // Access PostHog feature flags
    const isEnabled = posthog.isFeatureEnabled('new-feature')
}

// Access RudderStack directly
if (tracking?.has_initialized) {
    const userId = tracking.getUserId()
    const anonId = tracking.getAnonymousId()
}
```

## API Reference

### `initialise(options: Options): Promise<void>`

Initialize the analytics instance.

**Parameters:**

```typescript
interface Options {
    rudderstackKey?: string
    posthogOptions?: {
        apiKey: string
        allowedDomains?: string[]
        config?: PostHogConfig
    }
    /** Enable verbose debug logging — all analytics calls are logged prefixed with [ANALYTIC] */
    debug?: boolean
}
```

### `trackEvent<T>(event: T, payload: TAllEvents[T]): void`

Track a typed event.

### `pageView(url: string, platform?: string, properties?: Record<string, unknown>): void`

Track page navigation.

### `identifyEvent(userId?: string, traits?: Record<string, any>): void`

Link anonymous session to a user ID with optional traits. When PostHog is active and traits include an `email` field (via provider-specific `posthog` key), `is_internal` is automatically computed and set as a person property — the email itself is not stored in PostHog.

### `backfillPersonProperties(user_id: string, email: string): void`

Backfills PostHog person properties for users identified in previous sessions. Sets `client_id` and `is_internal` if they are not already present. No-op if PostHog is not initialized or `user_id` is empty.

```typescript
// Call after PostHog has loaded and user ID is available
Analytics.backfillPersonProperties('CR123456', 'user@example.com')
```

### `setAttributes(attributes: TCoreAttributes): void`

Update user attributes that flow to all providers.

### `reset(): void`

Clear user session from all providers.

### `getId(): string`

Get the current user ID.

### `getAnonymousId(): string`

Get the anonymous user ID.

### `getInstances(): { tracking, posthog }`

Access raw provider instances.

## Performance

### Benchmarks

- **Event tracking**: <5ms (average)
- **Page view tracking**: <3ms (average)
- **Initialization**: ~200ms (with both providers)
- **Offline cache replay**: <50ms for 10 events

### Optimizations

- **Tree-Shaking**: Unused providers completely removed from bundle
- **Lazy Loading**: PostHog loaded dynamically only when configured
- **Event Batching**: RudderStack batches events (10 events or 10 seconds)
- **SendBeacon**: Uses `navigator.sendBeacon` for reliable event delivery on page unload
- **Deduplication**: Prevents duplicate events from being sent

### Bundle Sizes

Estimated sizes (minified + gzipped):

- **Core (RudderStack + PostHog)**: ~32 KB
- **RudderStack Only**: ~18 KB
- **PostHog Only**: ~20 KB
- **Browser Bundle (all included)**: ~125 KB gzipped

## Troubleshooting

### Events not appearing in RudderStack

1. **Verify API key**: Check that `rudderstackKey` is correct
2. **Check network requests**: Open DevTools → Network tab → Look for requests to RudderStack dataplane
3. **Verify initialization**: Run `Analytics.getInstances().tracking.has_initialized` in console
4. **Check batching**: Events are batched - wait ~10 seconds or send 10 events

### PostHog not receiving events

1. **Verify API key**: Check that PostHog API key is correct (starts with `phc_`)
2. **Check domain allowlist**: Verify your domain is in the `allowedDomains` list
3. **Check initialization**: Run `Analytics.getInstances().posthog?.has_initialized` in console
4. **Verify network requests**: Check DevTools for requests to `ph.deriv.com` or your PostHog host
5. **Check browser console**: Look for PostHog errors or warnings

### Session recording not working

1. **Verify config**: Ensure `disable_session_recording: false` (or omit it)
2. **Check minimum duration**: Sessions shorter than `minimumDurationMilliseconds` are not saved
3. **Verify domain**: Check that PostHog is initialized and domain is allowed
4. **Check PostHog dashboard**: Recordings may take a few minutes to appear

### Events being cached but not sent

1. **Check online status**: Run `navigator.onLine` in console
2. **Verify SDK loaded**: Run `Analytics.getInstances().tracking.has_initialized`
3. **Check cookies**: Look for `rudder_*` and `analytics_cached_*` cookies in DevTools
4. **Clear cache manually**: Clear cookies or run `Analytics.reset()`

## Migration Guide

### From v1.x to v2.x

#### Breaking Changes

1. **identifyEvent signature changed**:

```typescript
// Old (v1.x) - hardcoded traits
Analytics.identifyEvent('CR123')

// New (v2.x) - custom traits
Analytics.identifyEvent('CR123', {
    language: 'en',
    country_of_residence: 'US',
})

// Or provider-specific
Analytics.identifyEvent('CR123', {
    rudderstack: { language: 'en' },
    posthog: { language: 'en', country_of_residence: 'US' },
})
```

2. **GrowthBook deprecated**: Migrate to PostHog feature flags

```typescript
// Old (GrowthBook)
const isEnabled = Analytics.isFeatureOn('new-feature')

// New (PostHog)
const { posthog } = Analytics.getInstances()
const isEnabled = posthog?.isFeatureEnabled('new-feature')
```

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Write tests for your changes
4. Run `npm test` and `npm run build`
5. Submit a pull request

## License

MIT

## Support

For issues and questions:

- **GitHub Issues**: https://github.com/binary-com/deriv-analytics/issues
- **Documentation**: https://github.com/binary-com/deriv-analytics
