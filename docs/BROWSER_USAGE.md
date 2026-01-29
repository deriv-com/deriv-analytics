# Browser Usage Guide

This package can be used directly in browsers via a `<script>` tag without any build tools.

## Quick Start

### Option 1: Using CDN (Recommended)

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Analytics Example</title>
    </head>
    <body>
        <!-- Load from CDN -->
        <script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

        <script>
            // Analytics is available as window.DerivAnalytics
            const { Analytics } = window.DerivAnalytics

            // Initialize
            const analytics = new Analytics()

            // Start tracking with RudderStack and PostHog
            analytics
                .initialise({
                    rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
                    posthogKey: 'YOUR_POSTHOG_KEY',
                    posthogOptions: {
                        enableSessionRecording: true,
                    },
                })
                .then(() => {
                    console.log('Analytics initialized!')

                    // Track events
                    analytics.trackEvent('page_view', {
                        page: 'home',
                        url: window.location.href,
                    })
                })
        </script>
    </body>
</html>
```

### Option 2: Self-Hosted

Download the bundle from npm and host it yourself:

```bash
npm pack @deriv-com/analytics
# Extract dist/browser/analytics.bundle.global.js
```

Then use it:

```html
<script src="/path/to/analytics.bundle.global.js"></script>
<script>
    const { Analytics } = window.DerivAnalytics
    // ... same as above
</script>
```

## Bundle Information

| Build Type         | Size (Minified) | Size (Gzipped) | Use Case                              |
| ------------------ | --------------- | -------------- | ------------------------------------- |
| **NPM (ESM)**      | 8.6 KB          | 3.4 KB         | Modern bundlers (webpack, vite, etc.) |
| **Browser (IIFE)** | 340 KB          | 108 KB         | Direct `<script>` tag usage           |

### What's Included in Browser Bundle

✅ **Included** (bundled):

- RudderStack Analytics SDK
- PostHog SDK
- js-cookie utility
- Analytics wrapper code

❌ **NOT Included**:

- GrowthBook SDK (optional - only needed for A/B testing)

**Perfect for**: Next.js, React, Webflow, OutSystems - when you only need RudderStack and PostHog tracking.

## API Reference

### Global Object

```javascript
window.DerivAnalytics = {
    Analytics: class Analytics { ... }
}
```

### Methods

All methods from the NPM package are available:

```javascript
const analytics = new Analytics(options)

// Initialize (async)
await analytics.initialise(options)

// Track events
analytics.trackEvent(eventName, properties)

// Page views
analytics.pageView(pageName)

// Identify users
analytics.identifyEvent(userId)

// Set attributes
analytics.setAttributes(attributes)

// Get feature flags (GrowthBook)
analytics.getFeatureValue(featureKey, defaultValue)
analytics.isFeatureOn(featureKey)
```

## TypeScript Support

The browser bundle doesn't include TypeScript types. For type checking, install the package as a dev dependency:

```bash
npm install --save-dev @deriv-com/analytics
```

Then reference types in your code:

```typescript
/// <reference types="@deriv-com/analytics" />

const analytics = new window.DerivAnalytics.Analytics({
    // TypeScript will provide autocomplete here
})
```

## Compatibility

- **Browsers**: ES2020+ (Chrome 80+, Firefox 72+, Safari 13.1+, Edge 80+)
- **IE11**: Not supported (use polyfills if needed)

## Migration from Webpack Build

If you were using the old webpack build (`analytics.bundle.js`):

**Old (webpack)**:

```html
<script src="analytics.bundle.js"></script>
<script>
    const analytics = new Analytics.Analytics({...});
</script>
```

**New (tsup)**:

```html
<script src="analytics.bundle.global.js"></script>
<script>
    const { Analytics } = window.DerivAnalytics;
    const analytics = new Analytics({...});
</script>
```

**Key Changes**:

- Global name changed from `Analytics` → `DerivAnalytics`
- Need to destructure: `const { Analytics } = window.DerivAnalytics`
- File name changed: `analytics.bundle.js` → `analytics.bundle.global.js`

## Examples

### Basic Tracking

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>
<script>
    const { Analytics } = window.DerivAnalytics
    const analytics = new Analytics()

    analytics
        .initialise({
            rudderstackKey: 'YOUR_KEY',
        })
        .then(() => {
            // Track button clicks
            document.querySelector('#cta-button').addEventListener('click', () => {
                analytics.trackEvent('cta_clicked', {
                    button_name: 'Get Started',
                    page: 'homepage',
                })
            })
        })
</script>
```

### With A/B Testing (GrowthBook)

```html
<script>
    const { Analytics } = window.DerivAnalytics
    const analytics = new Analytics()

    analytics
        .initialise({
            rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
            growthbookKey: 'YOUR_GROWTHBOOK_KEY',
            growthbookOptions: {
                attributes: {
                    country: 'us',
                    user_language: 'en',
                },
            },
        })
        .then(() => {
            // Get feature flag value
            const showNewDesign = analytics.isFeatureOn('new-homepage-design')

            if (showNewDesign) {
                document.body.classList.add('new-design')
            }

            // Track experiment exposure
            analytics.trackEvent('experiment_viewed', {
                experiment: 'new-homepage-design',
                variant: showNewDesign ? 'new' : 'control',
            })
        })
</script>
```

### Offline Event Caching

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>
<script>
    const { Analytics, cacheTrackEvents } = window.DerivAnalytics

    // Use caching utility (separate import since v1.36.0)
    // Note: In browser bundle, caching is built-in to Analytics class
    const analytics = new Analytics()

    // Events are automatically cached if tracking fails
    analytics.trackEvent('page_view', { page: 'home' })
</script>
```

## Performance Tips

1. **Load Async**: Use `defer` or `async` to avoid blocking page load

    ```html
    <script defer src="analytics.bundle.global.js"></script>
    ```

2. **CDN Benefits**: jsdelivr provides automatic gzip compression and global CDN

3. **Lazy Load**: For better initial page load, load analytics after critical content
    ```javascript
    window.addEventListener('load', () => {
        const script = document.createElement('script')
        script.src = 'analytics.bundle.global.js'
        document.head.appendChild(script)
    })
    ```

## Troubleshooting

### "DerivAnalytics is not defined"

Make sure the script loads before you use it:

```html
<!-- Load bundle first -->
<script src="analytics.bundle.global.js"></script>

<!-- Then use it -->
<script>
    const { Analytics } = window.DerivAnalytics
</script>
```

### CORS Errors

If loading from your own server, ensure CORS headers are set:

```
Access-Control-Allow-Origin: *
```

### Bundle Size Concerns

The browser bundle is 108KB gzipped. If this is too large:

1. Use the NPM package with a bundler (webpack, vite) for tree-shaking
2. Only load providers you need
3. Lazy load analytics after critical page content

## Support

For issues and questions, visit:
https://github.com/binary-com/deriv-analytics/issues
