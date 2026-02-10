# @deriv-com/analytics

A modern, tree-shakeable analytics library for tracking user events with RudderStack and GrowthBook feature flags. Designed for optimal performance with advanced caching, batching, and independent package usage.

## Features

- ✅ **Multi-Provider Support**: RudderStack for tracking and GrowthBook for A/B testing
- 🎄 **Tree-Shakeable**: Only bundle what you use - each provider can be imported independently
- 📡 **Offline-First**: Automatic event caching when offline with replay on reconnection
- ⚡ **Performance Optimized**: Batching, deduplication, and SendBeacon API for fast tracking
- 🔐 **Type-Safe**: Full TypeScript support with discriminated unions for event payloads
- 🔄 **Backward Compatible**: Supports older React, Node.js, and other legacy package versions
- 🤖 **Bot Filtering**: Optional bot detection to filter crawler traffic
- 💾 **Advanced Caching**: Built-in utilities for complex caching scenarios

## Installation

```bash
npm install @deriv-com/analytics
```

### Optional Dependencies

Install only what you need:

```bash
# For A/B testing with GrowthBook (optional)
npm install @growthbook/growthbook
```

**Note**: Core dependencies (`@rudderstack/analytics-js` and `js-cookie`) are installed automatically.

### Browser Usage (No Build Tools)

Use directly in browsers with a `<script>` tag:

```html
<!-- Load from CDN -->
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    const { Analytics } = window.DerivAnalytics
    const analytics = new Analytics()

    analytics
        .initialise({
            rudderstackKey: 'YOUR_KEY',
        })
        .then(() => {
            analytics.trackEvent('page_view', { page: 'home' })
        })
</script>
```

**Bundle Size**: 340 KB minified / 108 KB gzipped (includes all dependencies)

📖 **Full browser usage guide**: See [BROWSER_USAGE.md](./BROWSER_USAGE.md) for detailed instructions, examples, and migration guide.

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
Analytics.identifyEvent('user-123')
```

### Using All Providers Together

```typescript
import { Analytics } from '@deriv-com/analytics'

await Analytics.initialise({
    // RudderStack for tracking (required)
    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',

    // GrowthBook for A/B testing (optional)
    growthbookKey: 'YOUR_GROWTHBOOK_KEY',
    growthbookDecryptionKey: 'YOUR_DECRYPTION_KEY',
    growthbookOptions: {
        attributes: {
            user_language: 'en',
            country: 'US',
        },
    },

    // Optional bot filtering
    enableBotFiltering: true,
})

// Track events
Analytics.trackEvent('ce_login_form', {
    action: 'login_cta',
    login_provider: 'google',
})

// Access feature flags from GrowthBook
const showNewFeature = Analytics.isFeatureOn('new-dashboard')
const buttonConfig = Analytics.getFeatureValue('tracking-buttons-config', {})
```

### Independent Package Usage

Each provider can be used independently for maximum flexibility:

#### GrowthBook Only

```typescript
import { Growthbook } from '@deriv-com/analytics/growthbook'

const gb = Growthbook.getGrowthBookInstance('YOUR_KEY', 'YOUR_DECRYPTION_KEY', {
    attributes: { country: 'US' },
})

const isEnabled = gb.isOn('new-feature')
const variant = gb.getFeatureValue('button-color', 'blue')
```

## Advanced Caching Utilities

The package includes powerful caching utilities for scenarios where you need more control:

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
        cache: true,
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

## API Reference

### Analytics (Main Instance)

#### `initialise(options: Options): Promise<void>`

Initialize the analytics instance with provider configurations.

#### `trackEvent<T>(event: T, payload: TAllEvents[T]): void`

Track a typed event. Supports both V1 (flat) and V2 (structured) event formats.

```typescript
// V1 Event (flat structure)
Analytics.trackEvent('ce_login_form', {
    action: 'login_cta',
    login_provider: 'email',
})

// V2 Event (structured with metadata)
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

#### `pageView(url: string, platform?: string, properties?: Record<string, unknown>): void`

Track page navigation.

#### `identifyEvent(userId?: string): void`

Link anonymous session to a user ID.

#### `setAttributes(attributes: TCoreAttributes): void`

Update user attributes that flow to all providers.

```typescript
Analytics.setAttributes({
    country: 'US',
    user_language: 'en',
    account_type: 'real',
    device_type: 'mobile',
})
```

#### `reset(): void`

Clear user session from all providers.

#### `getInstances(): { ab, tracking }`

Access raw provider instances for advanced use cases.

### Feature Flag Methods (GrowthBook)

#### `isFeatureOn(key: string): boolean`

Check if a feature flag is enabled.

#### `getFeatureValue<K>(id: K, defaultValue: V): V`

Get typed feature flag value with fallback.

#### `getFeatureState(id: string): string | undefined`

Get experiment assignment for a feature.

## Configuration

### RudderStack Configuration

The RudderStack integration includes performance optimizations:

- **Event Batching**: Flushes after 10 events or 10 seconds
- **SendBeacon API**: Uses navigator.sendBeacon for better performance
- **Retry Queue**: Automatic retry for failed requests
- **Cookie Management**: Automatic anonymous ID generation and persistence

### GrowthBook Configuration

```typescript
growthbookOptions: {
    attributes: {
        country: 'US',
        user_language: 'en',
        device_type: 'desktop',
        loggedIn: true,
    },
}
```

## Performance Optimizations

### RudderStack

- **Batching**: Events are batched (10 events or 10 seconds)
- **SendBeacon**: Uses `navigator.sendBeacon` for page unload events
- **Retry Queue**: Failed requests are retried automatically
- **Reduced API Calls**: From 600ms-1s to <200ms with batching

### General

- **Tree-Shaking**: Unused providers are completely removed from bundle
- **Lazy Loading**: GrowthBook is dynamically imported only when needed
- **Bot Filtering**: Optional bot detection prevents wasted API calls

## Bundle Size

To check the bundle size after building:

```bash
npm run build
ls -lh dist/
```

Estimated sizes (minified + gzipped):

- Core only (RudderStack): ~8-12 KB
-   - GrowthBook: +12-18 KB
- Full (all providers): ~20-30 KB

## Examples

### React Integration

```typescript
import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

function App() {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.REACT_APP_RUDDERSTACK_KEY,
        })
    }, [])

    const handleSignup = () => {
        Analytics.trackEvent('ce_virtual_signup_form', {
            action: 'signup_modal_open',
            form_source: 'header_cta',
        })
    }

    return <button onClick={handleSignup}>Sign Up</button>
}
```

### Next.js App Router

```typescript
// app/providers.tsx
'use client'

import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

export function AnalyticsProvider({ children }) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
        })
    }, [])

    return <>{children}</>
}
```

## Browser Compatibility

- Modern browsers (ES2020+)
- Chrome, Firefox, Safari, Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Events not appearing in RudderStack

- Check that `rudderstackKey` is correct
- Verify network requests in DevTools (should see batched requests)
- Ensure initialization: `Analytics.getInstances().tracking.has_initialized`

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm test` and `npm run build`
5. Submit a pull request

## License

MIT

## Support

For issues and questions:

- GitHub Issues: https://github.com/binary-com/deriv-analytics/issues
- Documentation: https://github.com/binary-com/deriv-analytics

## Changelog

### v1.35.1 (2026-01-28)

- ⚡ Performance optimizations for RudderStack (batching, SendBeacon, retry queue)
- 💾 Advanced caching utilities for complex scenarios
- 🔧 Dynamic configuration updates
- 🎄 Tree-shakeable exports for independent package usage
- 📘 Full TypeScript support with comprehensive types
- 📚 Improved documentation and examples
