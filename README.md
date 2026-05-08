# @deriv-com/analytics

A modern, tree-shakeable analytics library for tracking user events with RudderStack and PostHog. Designed for optimal performance with advanced caching, batching, and offline support.

## Features

- 📊 **Multi-Provider Support**: RudderStack for event tracking and PostHog for analytics & session recording
- 🎄 **Tree-Shakeable**: Only bundle what you use - each provider can be imported independently
- 📡 **Offline-First**: Automatic event caching when offline with replay on reconnection
- ⚡ **Performance Optimized**: Batching, deduplication, and SendBeacon API for fast tracking
- 🔄 **Backward Compatible**: Supports older React, Node.js, and other legacy package versions
- 💾 **Advanced Caching**: localStorage and in-memory caching for robust event delivery
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
        - [Enforced settings](#enforced-settings)
        - [Overridable defaults](#overridable-defaults)
        - [Do not capture $pageview manually](#-do-not-capture-pageview-manually)
        - [Domain allowlist](#domain-allowlist)
- [Core API](#core-api)
    - [Initialization](#initialization)
    - [Event Tracking](#event-tracking)
    - [User Identification](#user-identification)
    - [Page Views](#page-views)
    - [User Attributes](#user-attributes)
- [Caching & Offline Support](#caching--offline-support)
- [Debug Mode](#debug-mode)
- [Advanced Usage](#advanced-usage)
- [PostHog Feature Flags](#posthog-feature-flags)
- [PostHog Integration Checklist](#posthog-integration-checklist)
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

The recommended pattern is a single `useAnalytics` hook that handles initialization and exposes all tracking methods:

```typescript
// hooks/useAnalytics.ts
import { useEffect } from 'react'
import { Analytics } from '@deriv-com/analytics'

let isInitialized = false

export function useAnalytics() {
    useEffect(() => {
        if (isInitialized) return
        isInitialized = true

        const rudderstackKey = process.env.REACT_APP_RUDDERSTACK_KEY // ← replace with your env var
        const posthogKey = process.env.REACT_APP_POSTHOG_KEY // ← replace with your env var

        if (!rudderstackKey && !posthogKey) return

        Analytics.initialise({
            ...(rudderstackKey && { rudderstackKey }),
            ...(posthogKey && {
                posthogOptions: {
                    apiKey: posthogKey,
                    api_host: process.env.REACT_APP_POSTHOG_HOST,
                },
            }),
            debug: process.env.NODE_ENV === 'development',
        })
    }, [])

    return {
        trackEvent: Analytics.trackEvent,
        identifyEvent: Analytics.identifyEvent,
        pageView: Analytics.pageView,
        loadEvent: Analytics.loadEvent,
        setAttributes: Analytics.setAttributes,
        reset: Analytics.reset,
    }
}
```

Call the hook once at the top of your app:

```tsx
// App.tsx
import { useAnalytics } from './hooks/useAnalytics'

function App() {
    const { trackEvent } = useAnalytics()

    return <button onClick={() => trackEvent('ce_signup_button', { action: 'click' })}>Sign Up</button>
}
```

### Next.js Integration

#### App Router (Next.js 13+)

Use the same `useAnalytics` hook (with `NEXT_PUBLIC_` env var prefix) inside a dedicated client provider:

```typescript
// hooks/useAnalytics.ts
'use client'

import { useEffect } from 'react'
import { Analytics } from '@deriv-com/analytics'

let isInitialized = false

export function useAnalytics() {
    useEffect(() => {
        if (isInitialized) return
        isInitialized = true

        const rudderstackKey = process.env.NEXT_PUBLIC_RUDDERSTACK_KEY // ← replace with your env var
        const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY // ← replace with your env var

        if (!rudderstackKey && !posthogKey) return

        Analytics.initialise({
            ...(rudderstackKey && { rudderstackKey }),
            ...(posthogKey && {
                posthogOptions: {
                    apiKey: posthogKey,
                    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
                },
            }),
            debug: process.env.NODE_ENV === 'development',
        })
    }, [])

    return {
        trackEvent: Analytics.trackEvent,
        identifyEvent: Analytics.identifyEvent,
        pageView: Analytics.pageView,
        loadEvent: Analytics.loadEvent,
        setAttributes: Analytics.setAttributes,
        reset: Analytics.reset,
    }
}
```

```tsx
// app/analytics-provider.tsx
'use client'

import { useAnalytics } from '@/hooks/useAnalytics'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    useAnalytics()
    return <>{children}</>
}

// app/layout.tsx
import { AnalyticsProvider } from './analytics-provider'

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
import { useAnalytics } from '../hooks/useAnalytics'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
    useAnalytics()
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
- **Cookie Management**: Automatic anonymous ID generation and persistence (6-month cookie lifetime)
- **Offline Support**: Events are cached when offline and replayed when connection is restored

### PostHog Configuration

PostHog provides analytics, session recording, and feature flags.

#### Initialisation

`getPosthogInstance` (and `Analytics.initialise`) use a singleton — calling them more than once with the same key returns the existing instance without re-running the SDK init. Call once at app startup, not inside render loops.

```typescript
await Analytics.initialise({
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
    posthogOptions: {
        apiKey: 'phc_YOUR_KEY',

        // Optional: override the auto-resolved API host (see table below)
        api_host: 'https://ph.deriv.com',

        // Optional: overridable settings (see "Overridable defaults" table below)
        config: {
            autocapture: false, // disable autocapture entirely
            disable_session_recording: true, // opt out of session recording
            session_recording: {
                sessionRecordingSampleRate: 0.5, // record 50% of sessions
            },
            before_send: event => {
                // your function runs after the built-in domain + timestamp filter
                if (event?.properties?.sensitive_field) return null
                return event
            },
        },
    },
})
```

`api_host` is auto-resolved from `window.location.hostname` if omitted:

| Domain pattern         | Resolved host          |
| ---------------------- | ---------------------- |
| `*.deriv.me`           | `https://ph.deriv.me`  |
| `*.deriv.be`           | `https://ph.deriv.be`  |
| `*.deriv.ae`           | `https://ph.deriv.ae`  |
| all others (incl. SSR) | `https://ph.deriv.com` |

#### Enforced settings

These are applied **after** any consumer `config` spread. Passing them in `config` has no effect:

| Setting                                         | Value               | Reason                                                 |
| ----------------------------------------------- | ------------------- | ------------------------------------------------------ |
| `person_profiles`                               | `'identified_only'` | Prevents anonymous profile bloat                       |
| `capture_pageview`                              | `'history_change'`  | SPA-safe — fires on every `pushState` / `replaceState` |
| `capture_pageleave`                             | `true`              | Standard session completeness                          |
| `session_recording.recordCrossOriginIframes`    | `true`              | Captures embedded tools                                |
| `session_recording.minimumDurationMilliseconds` | `30000`             | Filters sub-30-second noise sessions                   |
| `session_recording.maskAllInputs`               | `true`              | Privacy — cannot be lowered by consumers               |

Consumer keys inside `session_recording` are spread **before** these enforced values, so extras like `sessionRecordingSampleRate` take effect without conflicting.

#### Overridable defaults

| Setting                            | Default                              | Override when…                                                     |
| ---------------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| `autocapture`                      | `{ dom_event_allowlist: ['click'] }` | You need more event types, or want to disable autocapture entirely |
| `rate_limiting.events_per_second`  | `10`                                 | Legitimate user flows are hitting the burst limiter                |
| `rate_limiting.events_burst_limit` | `100`                                | Legitimate user flows are hitting the burst limiter                |

#### ⚠ Do not capture `$pageview` manually

`capture_pageview: 'history_change'` is enforced and fires automatically on every client-side navigation. Adding a manual `posthog.capture('$pageview')` **doubles your pageview count** and contributes to `$client_ingestion_warning` rate-limit hits.

**React Router:**

```typescript
// ❌ Remove this
useEffect(() => {
    posthog.capture('$pageview')
}, [location.pathname])

// ✅ Nothing needed — capture_pageview: 'history_change' handles it
```

**Vue Router:**

```typescript
// ❌ Remove this
router.afterEach(() => {
    posthog.capture('$pageview')
})

// ✅ Nothing needed — capture_pageview: 'history_change' handles it
```

#### Domain allowlist

Events are silently blocked in `before_send` unless the hostname matches:

- `deriv.com`, `deriv.be`, `deriv.me`, `deriv.team`, `deriv.ae`
- `localhost` and `127.0.0.1` are always allowed

This list is hardcoded and not configurable.

#### Stale cookie cleanup

On every init, leftover `ph_*_posthog` cookies from previous or rotated API keys are removed automatically. No action needed.

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

Track custom events with any payload — there are no enforced property types. Send exactly what your event needs:

```typescript
Analytics.trackEvent('ce_login_form', {
    action: 'login_cta',
    login_provider: 'email',
    form_name: 'main_login',
})

Analytics.trackEvent('ce_signup_form', {
    action: 'signup_done',
    signup_provider: 'google',
    cta_information: {
        cta_name: 'get_started',
        section_name: 'hero',
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

#### PostHog identity lifecycle

| Scenario                                                                        | Call                                                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| User logs in                                                                    | `identifyEvent(user_id, { posthog: { email, language, country_of_residence } })` |
| User logs out                                                                   | `reset()`                                                                        |
| User already identified in a previous session, person properties may be missing | `backfillPersonProperties({ user_id, email, language, country_of_residence })`   |

**`identifyEvent`** links the anonymous PostHog session to the user and enforces `client_id`. Skip it if the current distinct ID is already the same `user_id` — the library does this check automatically.

**`reset`** clears the PostHog session on logout. Future events are anonymous until the next `identifyEvent`.

**`backfillPersonProperties`** fills in properties that may be missing on a returning user's profile (e.g. `client_id`, `is_internal`). It checks each property before writing and is a no-op if everything is already present. Call it once after the user ID is available, alongside or instead of `identifyEvent` for returning users.

> **Account-switch guard**: both `identifyEvent` and `backfillPersonProperties` detect when PostHog's stored distinct ID belongs to a _different_ identified user (not an anonymous UUID) and call `posthog.reset()` automatically before identifying the new user. This prevents profiles from merging across accounts.

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

**Note**: PostHog page views are captured automatically via the enforced `capture_pageview: 'history_change'` setting. Do not call `posthog.capture('$pageview')` manually — see the [⚠ Do not capture `$pageview` manually](#-do-not-capture-pageview-manually) section. Manual page view tracking via `Analytics.pageView()` is primarily for RudderStack.

### User Attributes

Set user and context attributes that are automatically included in all subsequent events. Pass any key-value pairs — no fixed schema is enforced:

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
    // any additional fields your app needs
})
```

### Reset User Session

Clear user session from all providers (e.g., on logout):

```typescript
Analytics.reset()
```

## Caching & Offline Support

The package includes automatic caching to ensure no events are lost — no extra configuration needed.

### localStorage Caching (SDK not yet loaded)

When you call `trackEvent` or `pageView` before `initialise()` completes, events are stored in `localStorage` and replayed automatically once the SDK loads:

```typescript
// Safe to call before initialise() — automatically replayed on load
Analytics.trackEvent('button_clicked', { button: 'submit' })
Analytics.pageView('/dashboard')
```

### In-Memory Caching (offline)

When the user is offline but the SDK is already initialized, events are held in memory and flushed on the next online `trackEvent` call:

```typescript
// While offline — queued in memory, sent automatically when back online
Analytics.trackEvent('offline_event', { data: 'cached' })
```

### Route-Based Events

Fire events only on specific pages using `loadEvent`:

```typescript
Analytics.loadEvent([
    {
        pages: ['dashboard', 'profile'],
        event: { name: 'ce_page_load', properties: { page_type: 'authenticated' } },
    },
    {
        excludedPages: ['login'],
        event: { name: 'ce_authenticated_view', properties: {} },
    },
])
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

## PostHog Feature Flags

Access feature flags through the `posthog` instance:

```typescript
const { posthog } = Analytics.getInstances()

// Boolean flag — returns true, false, or undefined (not ready)
const isEnabled = posthog?.isFeatureEnabled('my-flag')

// Multivariate flag — returns a string variant, boolean, or undefined
const variant = posthog?.getFeatureFlag('button-color') // e.g. 'red' | 'blue' | true | undefined

// Structured payload attached to a flag
const config = posthog?.getFeatureFlagPayload('pricing-config') // e.g. { price: 9.99 }

// All active flags as a map
const allFlags = posthog?.getAllFlags() // { 'flag-a': true, 'flag-b': 'variant-x' }

// Subscribe to flag changes (fires immediately + on every reload)
const unsubscribe = posthog?.onFeatureFlags((flags, variants) => {
    console.log('active flags:', flags)
    console.log('variants:', variants)
})
// Call unsubscribe() to stop listening

// Force a reload from the server (e.g. after login or attribute change)
posthog?.reloadFeatureFlags()
```

When using PostHog directly (without the `Analytics` wrapper):

```typescript
import { Posthog } from '@deriv-com/analytics/posthog'

const posthog = Posthog.getPosthogInstance({ apiKey: 'phc_YOUR_KEY' })
const isEnabled = posthog.isFeatureEnabled('my-flag')
```

## PostHog Integration Checklist

Before shipping, verify:

- [ ] `Analytics.initialise` (or `getPosthogInstance`) is called **once** at app startup — not on every render or route change
- [ ] No `posthog.capture('$pageview')` calls remain — search the codebase and remove them
- [ ] `identifyEvent` is called on login with `email` in PostHog traits (needed for the `is_internal` flag)
- [ ] `reset()` is called on logout
- [ ] `backfillPersonProperties` is called for returning users when the user ID is available
- [ ] Your domain is in the allowlist — if testing on a non-`deriv.*` domain other than `localhost`, events are silently blocked
- [ ] `debug: true` is removed or guarded behind `process.env.NODE_ENV === 'development'`

## API Reference

### `initialise(options: Options): Promise<void>`

Initialize the analytics instance.

**Parameters:**

```typescript
interface Options {
    rudderstackKey?: string
    posthogOptions?: {
        apiKey: string
        /**
         * Optional PostHog API host. If omitted, resolved automatically based on window.location.hostname:
         *   *.deriv.me  → https://ph.deriv.me
         *   *.deriv.be  → https://ph.deriv.be
         *   *.deriv.ae  → https://ph.deriv.ae
         *   all others  → https://ph.deriv.com (default; also used server-side)
         */
        api_host?: string
        config?: PostHogConfig
    }
    /** Enable verbose debug logging — all analytics calls are logged prefixed with [ANALYTIC] */
    debug?: boolean
}
```

### `trackEvent(event: string, payload: Record<string, any>): void`

Track an event. No payload schema is enforced — send any key-value pairs.

### `pageView(url: string, platform?: string, properties?: Record<string, unknown>): void`

Track page navigation.

### `identifyEvent(userId?: string, traits?: Record<string, any>): void`

Link anonymous session to a user ID with optional traits. When PostHog is active and traits include an `email` field (via provider-specific `posthog` key), `is_internal` is automatically computed and set as a person property — the email itself is not stored in PostHog.

### `backfillPersonProperties({ user_id, email?, country_of_residence? }): void`

Backfills PostHog person properties for users identified in previous sessions. Sets `client_id` and `is_internal` if they are not already present. No-op if PostHog is not initialized or `user_id` is empty.

```typescript
// Call after PostHog has loaded and user ID is available
Analytics.backfillPersonProperties({ user_id: 'CR123456', email: 'user@example.com', country_of_residence: 'US' })
```

### `setAttributes(attributes: Record<string, any>): void`

Update user attributes that flow to all providers. No schema is enforced.

### `loadEvent(items: PageLoadEventConfig[]): void`

Fire events conditionally based on the current page pathname.

```typescript
type PageLoadEventConfig = {
    pages?: string[] // fire only on these pages
    excludedPages?: string[] // fire on all pages except these
    event: { name: string; properties: Record<string, any> }
    callback?: () => { name: string; properties: Record<string, any> }
}
```

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
3. **Check storage**: Open DevTools → Application → Local Storage — look for `cached_analytics_events` and `cached_analytics_page_views` keys. The `rudder_anonymous_id` is still stored as a cookie.
4. **Clear cache manually**: Clear localStorage keys or run `Analytics.reset()`

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
