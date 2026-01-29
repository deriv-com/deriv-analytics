# RudderStack Caching Utilities - Browser Guide

Complete guide to using RudderStack cache utilities in browser environments (Webflow, OutSystems, vanilla JavaScript).

## 🎯 What Are Cache Utilities?

Cache utilities help you:

- ✅ Track events **before** analytics is initialized
- ✅ Store events **offline** when network is unavailable
- ✅ **Replay events** automatically when connection is restored
- ✅ Never lose important tracking data

Perfect for: Forms, CTAs, early page interactions

---

## 📦 What's Included in Browser Bundle

The browser bundle now includes **all cookie-based caching utilities**:

```javascript
window.DerivAnalytics = {
    Analytics: class Analytics { ... },

    // Cache utilities ✅ NEW!
    cacheEventToCookie: function,
    getCachedEvents: function,
    clearCachedEvents: function,
    cachePageViewToCookie: function,
    getCachedPageViews: function,
    clearCachedPageViews: function
}
```

---

## 🚀 Quick Start

### Basic Usage

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    const { Analytics, cacheEventToCookie, getCachedEvents, clearCachedEvents } = window.DerivAnalytics

    // Track event before analytics is ready
    cacheEventToCookie('early_click', {
        button: 'hero_cta',
        timestamp: Date.now(),
    })

    // Initialize analytics
    const analytics = new Analytics()
    analytics
        .initialise({
            rudderstackKey: 'YOUR_KEY',
            posthogKey: 'YOUR_KEY',
        })
        .then(() => {
            // Send cached events
            const cachedEvents = getCachedEvents()
            cachedEvents.forEach(event => {
                analytics.trackEvent(event.name, event.properties)
            })

            // Clear cache
            clearCachedEvents()
        })
</script>
```

---

## 📋 Available Functions

### 1. `cacheEventToCookie(eventName, properties)`

Cache an event to cookies before analytics is ready.

```javascript
const { cacheEventToCookie } = window.DerivAnalytics

// Cache single event
cacheEventToCookie('button_clicked', {
    button_id: 'signup-cta',
    page: 'homepage',
    timestamp: Date.now(),
})
```

**Parameters**:

- `eventName` (string): Event name
- `properties` (object): Event properties

**Storage**: Stored in cookie `cached_analytics_events` (expires in 1 day)

---

### 2. `getCachedEvents()`

Retrieve all cached events from cookies.

```javascript
const { getCachedEvents } = window.DerivAnalytics

const events = getCachedEvents()
console.log(events)
// [
//   { name: 'button_clicked', properties: {...}, timestamp: 1234567890 },
//   { name: 'form_submitted', properties: {...}, timestamp: 1234567900 }
// ]
```

**Returns**: Array of cached events with structure:

```typescript
{
    name: string,
    properties: object,
    timestamp: number
}
```

---

### 3. `clearCachedEvents()`

Clear all cached events from cookies.

```javascript
const { clearCachedEvents } = window.DerivAnalytics

// After sending cached events to analytics
clearCachedEvents()
```

---

### 4. `cachePageViewToCookie(pageName, properties?)`

Cache page view to cookies.

```javascript
const { cachePageViewToCookie } = window.DerivAnalytics

cachePageViewToCookie('Homepage', {
    url: window.location.href,
    referrer: document.referrer,
    timestamp: Date.now(),
})
```

**Parameters**:

- `pageName` (string): Page name
- `properties` (object, optional): Additional properties

---

### 5. `getCachedPageViews()`

Retrieve all cached page views.

```javascript
const { getCachedPageViews } = window.DerivAnalytics

const pageViews = getCachedPageViews()
console.log(pageViews)
// [
//   { name: 'Homepage', properties: {...}, timestamp: 1234567890 }
// ]
```

---

### 6. `clearCachedPageViews()`

Clear all cached page views.

```javascript
const { clearCachedPageViews } = window.DerivAnalytics

clearCachedPageViews()
```

---

## 🎨 Real-World Examples

### Example 1: Track Early Button Clicks (Webflow)

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    const { Analytics, cacheEventToCookie, getCachedEvents, clearCachedEvents } = window.DerivAnalytics

    // Track clicks immediately (even before analytics loads)
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-track]').forEach(function (button) {
            button.addEventListener('click', function () {
                // Cache immediately
                cacheEventToCookie('cta_clicked', {
                    button_id: this.id,
                    button_text: this.textContent.trim(),
                    page: document.title,
                    cached: true,
                })
            })
        })
    })

    // Initialize analytics later
    window.addEventListener('load', function () {
        const analytics = new Analytics()

        analytics
            .initialise({
                rudderstackKey: 'YOUR_KEY',
                posthogKey: 'YOUR_KEY',
            })
            .then(function () {
                // Send all cached events
                const cached = getCachedEvents()
                console.log('Replaying', cached.length, 'cached events')

                cached.forEach(function (event) {
                    analytics.trackEvent(event.name, event.properties)
                })

                // Clear cache
                clearCachedEvents()
            })
    })
</script>

<!-- Usage in HTML -->
<button data-track id="hero-cta">Get Started</button>
<button data-track id="learn-more">Learn More</button>
```

---

### Example 2: Offline Form Submission (OutSystems)

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    const { cacheEventToCookie, getCachedEvents, clearCachedEvents } = window.DerivAnalytics

    // Handle form submission
    function handleFormSubmit(formData) {
        // Try to send immediately
        if (window.analyticsInstance && window.analyticsInstance.trackEvent) {
            window.analyticsInstance.trackEvent('form_submitted', formData)
        } else {
            // Cache for later if analytics not ready
            cacheEventToCookie('form_submitted', formData)
        }
    }

    // Replay cached events when analytics becomes available
    function replayCachedEvents() {
        if (window.analyticsInstance) {
            const events = getCachedEvents()

            if (events.length > 0) {
                events.forEach(function (event) {
                    window.analyticsInstance.trackEvent(event.name, event.properties)
                })
                clearCachedEvents()
            }
        }
    }

    // Check periodically if analytics is ready
    var replayInterval = setInterval(function () {
        if (window.analyticsInstance) {
            replayCachedEvents()
            clearInterval(replayInterval)
        }
    }, 500)
</script>
```

---

### Example 3: Page View Tracking with Fallback (Next.js Client Component)

```typescript
'use client'
import { useEffect } from 'react'

export function AnalyticsPageView({ pageName }: { pageName: string }) {
    useEffect(() => {
        // Import from browser bundle if using script tag
        const { Analytics, cachePageViewToCookie, getCachedPageViews, clearCachedPageViews } =
            (window as any).DerivAnalytics || {}

        if (!Analytics) {
            // Analytics not loaded yet, cache the page view
            cachePageViewToCookie?.(pageName, {
                url: window.location.href,
                timestamp: Date.now(),
            })
            return
        }

        // Analytics ready, send cached page views
        const cachedViews = getCachedPageViews()
        if (cachedViews.length > 0) {
            cachedViews.forEach(view => {
                Analytics.pageView(view.name, view.properties)
            })
            clearCachedPageViews()
        }

        // Track current page view
        Analytics.pageView(pageName)
    }, [pageName])

    return null
}
```

---

### Example 4: Retry Failed Events

```html
<script>
    const { Analytics, cacheEventToCookie, getCachedEvents, clearCachedEvents } = window.DerivAnalytics

    const analytics = new Analytics()

    // Track with automatic retry
    function trackWithRetry(eventName, properties) {
        if (!analytics) {
            // Cache if analytics not initialized
            cacheEventToCookie(eventName, properties)
            return
        }

        try {
            analytics.trackEvent(eventName, properties)
        } catch (error) {
            console.error('Tracking failed, caching event:', error)
            // Cache on failure
            cacheEventToCookie(eventName, properties)
        }
    }

    // Usage
    trackWithRetry('button_clicked', { button: 'signup' })

    // Retry cached events periodically
    setInterval(function () {
        const cached = getCachedEvents()
        if (cached.length > 0 && analytics) {
            cached.forEach(function (event) {
                try {
                    analytics.trackEvent(event.name, event.properties)
                    // Success - clear this event
                    clearCachedEvents()
                } catch (error) {
                    // Keep in cache for next retry
                    console.log('Retry failed, will try again')
                }
            })
        }
    }, 10000) // Retry every 10 seconds
</script>
```

---

## 🍪 Cookie Storage Details

### Cookie Names

```javascript
cached_analytics_events // Stores events
cached_analytics_page_views // Stores page views
```

### Cookie Properties

```javascript
{
    domain: '.deriv.com',  // Works across subdomains
    path: '/',
    expires: 1 day,        // Auto-cleanup after 24 hours
    secure: true           // HTTPS only (in production)
}
```

### Storage Limits

- **Cookie size limit**: ~4KB per cookie
- **Typical event**: 100-200 bytes
- **Capacity**: ~20-40 events per cookie

**Best Practice**: Clear cache regularly to avoid hitting limits!

---

## ⚠️ Important Notes

### 1. Cookie Expiration

Cached events expire after **1 day**. Make sure to:

- Initialize analytics within 24 hours
- Replay cached events on page load
- Clear cache after successful replay

### 2. Privacy Considerations

```javascript
// Events are stored in cookies (user's browser)
// Visible in: Browser DevTools → Application → Cookies

// ✅ Good: General analytics
cacheEventToCookie('button_clicked', { button: 'cta' })

// ❌ Avoid: Sensitive data
cacheEventToCookie('form_submitted', {
    email: 'user@example.com', // Don't cache PII!
    password: '...', // Never cache passwords!
})
```

### 3. Cross-Domain Tracking

```javascript
// Cookies are domain-specific
// Cache on example.com → Not available on app.example.com

// Use with proper domain configuration:
// deriv.com, deriv.team, deriv.ae → Automatically handled
```

### 4. Browser Compatibility

```javascript
// Requires:
// - Cookies enabled
// - JavaScript enabled
// - Modern browser (ES2020+)

// Check cookie support:
if (navigator.cookieEnabled) {
    cacheEventToCookie('event', {})
} else {
    console.warn('Cookies disabled, caching unavailable')
}
```

---

## 🧪 Testing Cache Utilities

### Test in Browser Console

```javascript
// 1. Load the page with analytics script

// 2. Cache some events
const { cacheEventToCookie } = window.DerivAnalytics
cacheEventToCookie('test_event_1', { test: true, timestamp: Date.now() })
cacheEventToCookie('test_event_2', { test: true, timestamp: Date.now() })

// 3. Check cached events
const { getCachedEvents } = window.DerivAnalytics
console.log('Cached events:', getCachedEvents())

// 4. Clear cache
const { clearCachedEvents } = window.DerivAnalytics
clearCachedEvents()
console.log('After clear:', getCachedEvents()) // Should be []
```

### Check in DevTools

1. Open **Application** → **Cookies**
2. Look for `cached_analytics_events`
3. Value is JSON array of cached events
4. Expires in 1 day from creation

---

## 📊 Performance Best Practices

### 1. Batch Replay

```javascript
// ✅ Good: Batch replay after init
analytics.initialise({...}).then(() => {
    const events = getCachedEvents();
    events.forEach(event => analytics.trackEvent(event.name, event.properties));
    clearCachedEvents();
});

// ❌ Bad: Replay one by one with delays
events.forEach(event => {
    setTimeout(() => analytics.trackEvent(...), 100);
});
```

### 2. Early Cache Cleanup

```javascript
// Clear old events immediately after replay
const events = getCachedEvents();
if (events.length > 0) {
    events.forEach(event => analytics.trackEvent(...));
    clearCachedEvents(); // ✅ Clear immediately
}
```

### 3. Avoid Over-Caching

```javascript
// ✅ Good: Cache critical events only
cacheEventToCookie('purchase_completed', { amount: 99.99 })

// ❌ Bad: Cache every interaction
window.addEventListener('mousemove', () => {
    cacheEventToCookie('mouse_move', { x, y }) // Don't do this!
})
```

---

## 🎯 Use Cases

| Use Case                    | Function                | When to Use                        |
| --------------------------- | ----------------------- | ---------------------------------- |
| **Early page interactions** | `cacheEventToCookie`    | User clicks before analytics loads |
| **Offline form submission** | `cacheEventToCookie`    | Network unavailable                |
| **Page views**              | `cachePageViewToCookie` | Track page before analytics ready  |
| **Critical events**         | `cacheEventToCookie`    | Don't want to lose data            |
| **Replay on reconnect**     | `getCachedEvents`       | Network restored                   |

---

## ❓ FAQ

### Q: When should I use cache utilities?

**A**: When you need to track events **before** analytics is initialized or when the network is **offline**.

### Q: Are cached events sent automatically?

**A**: No, you must manually replay them using `getCachedEvents()` and send via `analytics.trackEvent()`.

### Q: What happens if cookies are disabled?

**A**: Caching won't work. Events will be lost. Always have fallback logic.

### Q: Can I cache events with large payloads?

**A**: Keep payloads small (< 1KB per event) to avoid cookie size limits.

### Q: How long do cached events persist?

**A**: 1 day. After that, they're automatically deleted by the browser.

---

## 📚 Complete Example (Production-Ready)

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Analytics with Caching</title>
    </head>
    <body>
        <!-- Load analytics bundle -->
        <script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

        <script>
            ;(function () {
                const { Analytics, cacheEventToCookie, getCachedEvents, clearCachedEvents } = window.DerivAnalytics

                let analyticsReady = false
                let analytics

                // Track events (with automatic caching)
                function trackEvent(eventName, properties) {
                    if (analyticsReady && analytics) {
                        // Analytics ready - send immediately
                        analytics.trackEvent(eventName, properties)
                    } else {
                        // Not ready - cache for later
                        cacheEventToCookie(eventName, {
                            ...properties,
                            cached_at: Date.now(),
                        })
                    }
                }

                // Replay cached events
                function replayCachedEvents() {
                    const cached = getCachedEvents()

                    if (cached.length > 0) {
                        console.log('Replaying', cached.length, 'cached events')

                        cached.forEach(function (event) {
                            analytics.trackEvent(event.name, event.properties)
                        })

                        clearCachedEvents()
                    }
                }

                // Initialize analytics
                function initAnalytics() {
                    analytics = new Analytics()

                    analytics
                        .initialise({
                            rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
                            posthogKey: 'YOUR_POSTHOG_KEY',
                        })
                        .then(function () {
                            analyticsReady = true
                            replayCachedEvents()
                            console.log('Analytics ready!')
                        })
                        .catch(function (error) {
                            console.error('Analytics init failed:', error)
                        })
                }

                // Track early clicks
                document.addEventListener('click', function (e) {
                    if (e.target.matches('[data-track]')) {
                        trackEvent('element_clicked', {
                            element_id: e.target.id,
                            element_text: e.target.textContent.trim(),
                            page: document.title,
                        })
                    }
                })

                // Initialize after page load
                window.addEventListener('load', initAnalytics)

                // Expose trackEvent globally
                window.trackEvent = trackEvent
            })()
        </script>

        <!-- Usage -->
        <button data-track id="hero-cta">Get Started</button>
        <button data-track id="learn-more">Learn More</button>
    </body>
</html>
```

---

**Summary**: Cache utilities are now included in the browser bundle. Use them to track events before analytics loads or when offline. Always replay cached events after initialization!
