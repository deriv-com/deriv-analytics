# Platform Compatibility Guide

This package is tested and compatible with multiple platforms and frameworks.

## ✅ Supported Platforms

| Platform       | Support        | Bundle Type    | Installation Method |
| -------------- | -------------- | -------------- | ------------------- |
| **Next.js**    | ✅ Full        | NPM (ESM/CJS)  | `npm install`       |
| **React.js**   | ✅ Full        | NPM (ESM/CJS)  | `npm install`       |
| **Webflow**    | ✅ Full        | Browser (IIFE) | `<script>` tag      |
| **OutSystems** | ✅ Full        | Browser (IIFE) | `<script>` tag      |
| **Node.js**    | ✅ Server-side | NPM (CJS)      | `npm install`       |
| **Vanilla JS** | ✅ Full        | Browser (IIFE) | `<script>` tag      |

---

## 📦 What's Included in Each Build

### NPM Package (for Next.js, React.js, Node.js)

```
✅ RudderStack Analytics
✅ PostHog Analytics
✅ GrowthBook (optional)
✅ Tree-shakeable modules
📦 8.6 KB minified (3.4 KB gzipped)
```

### Browser Bundle (for Webflow, OutSystems, Scripts)

```
✅ RudderStack Analytics
✅ PostHog Analytics
✅ js-cookie utilities
❌ GrowthBook (not included - optional)
📦 340 KB minified (108 KB gzipped)
```

**Note**: GrowthBook is excluded from the browser bundle because it's an optional A/B testing feature. For your use cases (RudderStack + PostHog only), this is perfect!

---

## 🚀 Integration Guide

### 1. Next.js Application

#### Installation

```bash
npm install @deriv-com/analytics
```

#### Usage in App Router (app/)

```typescript
// app/providers.tsx
'use client'

import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
            posthogOptions: {
                enableSessionRecording: true,
                enableAutocapture: false
            }
        })

        // Track page views
        Analytics.pageView('home')
    }, [])

    return <>{children}</>
}
```

```typescript
// app/layout.tsx
import { AnalyticsProvider } from './providers'

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <AnalyticsProvider>
                    {children}
                </AnalyticsProvider>
            </body>
        </html>
    )
}
```

#### Usage in Pages Router (pages/)

```typescript
// pages/_app.tsx
import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY!
        })
    }, [])

    return <Component {...pageProps} />
}
```

#### Tracking Events

```typescript
'use client' // or in any client component

import { Analytics } from '@deriv-com/analytics'

export function CTAButton() {
    return (
        <button
            onClick={() => {
                Analytics.trackEvent('cta_clicked', {
                    button_name: 'Get Started',
                    page: 'homepage'
                })
            }}
        >
            Get Started
        </button>
    )
}
```

---

### 2. React.js Application

#### Installation

```bash
npm install @deriv-com/analytics
```

#### Usage with Context

```typescript
// src/context/AnalyticsContext.tsx
import { Analytics } from '@deriv-com/analytics'
import { createContext, useEffect, ReactNode } from 'react'

export const AnalyticsContext = createContext<typeof Analytics>(Analytics)

export function AnalyticsProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: import.meta.env.VITE_RUDDERSTACK_KEY,
            posthogKey: import.meta.env.VITE_POSTHOG_KEY
        })
    }, [])

    return (
        <AnalyticsContext.Provider value={Analytics}>
            {children}
        </AnalyticsContext.Provider>
    )
}
```

```typescript
// src/App.tsx
import { AnalyticsProvider } from './context/AnalyticsContext'

function App() {
    return (
        <AnalyticsProvider>
            <YourApp />
        </AnalyticsProvider>
    )
}
```

#### Custom Hook

```typescript
// src/hooks/useAnalytics.ts
import { useContext } from 'react'
import { AnalyticsContext } from '../context/AnalyticsContext'

export function useAnalytics() {
    return useContext(AnalyticsContext)
}

// Usage in components
import { useAnalytics } from '../hooks/useAnalytics'

function MyComponent() {
    const analytics = useAnalytics()

    const handleClick = () => {
        analytics.trackEvent('button_clicked', { component: 'MyComponent' })
    }

    return <button onClick={handleClick}>Track Me</button>
}
```

---

### 3. Webflow Scripts

#### Setup

1. Go to your Webflow project settings
2. Navigate to **Custom Code** → **Footer Code**
3. Add the analytics script

#### Code

```html
<!-- Load Analytics Bundle -->
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>

<script>
    // Initialize on page load
    window.addEventListener('DOMContentLoaded', function () {
        const { Analytics } = window.DerivAnalytics
        const analytics = new Analytics()

        // Initialize with your keys
        analytics
            .initialise({
                rudderstackKey: 'YOUR_RUDDERSTACK_KEY',
                posthogKey: 'YOUR_POSTHOG_KEY',
                posthogOptions: {
                    enableSessionRecording: true,
                },
            })
            .then(function () {
                // Track page view
                analytics.pageView(document.title, {
                    url: window.location.href,
                    referrer: document.referrer,
                })

                // Add click tracking to CTA buttons
                document.querySelectorAll('[data-track-cta]').forEach(function (button) {
                    button.addEventListener('click', function () {
                        analytics.trackEvent('cta_clicked', {
                            button_text: this.textContent.trim(),
                            button_id: this.id || 'unknown',
                            page: document.title,
                        })
                    })
                })
            })
    })
</script>
```

#### Track Custom Elements

```html
<!-- Add data-track-cta to any button -->
<a href="/signup" data-track-cta class="button">Get Started</a>
<button data-track-cta class="cta-button">Learn More</button>
```

---

### 4. OutSystems Scripts

#### Step 1: Add External Script

1. In OutSystems Service Studio
2. Go to **UI Flows** → **Layouts** → Your layout
3. Add a **Script** element to the header or footer

#### Step 2: Load Analytics

```html
<script src="https://cdn.jsdelivr.net/npm/@deriv-com/analytics@latest/dist/browser/analytics.bundle.global.js"></script>
```

#### Step 3: Initialize in Screen Action

```javascript
// Create a client action called "InitializeAnalytics"
// Add JavaScript node with:

const { Analytics } = window.DerivAnalytics

if (!window.analyticsInstance) {
    window.analyticsInstance = new Analytics()

    window.analyticsInstance
        .initialise({
            rudderstackKey: $parameters.RudderstackKey,
            posthogKey: $parameters.PosthogKey,
        })
        .then(() => {
            // Track screen load
            window.analyticsInstance.pageView($parameters.ScreenName)
        })
}
```

#### Step 4: Track Events from Buttons

```javascript
// On button click action, add JavaScript node:

if (window.analyticsInstance) {
    window.analyticsInstance.trackEvent('button_clicked', {
        button_name: $parameters.ButtonName,
        screen: $parameters.ScreenName,
        user_id: $parameters.UserId,
    })
}
```

#### OutSystems Best Practices

```javascript
// Create a reusable client action: TrackEvent
// Input Parameters: EventName (Text), Properties (Text - JSON string)

if (window.analyticsInstance) {
    try {
        const props = JSON.parse($parameters.Properties || '{}')
        window.analyticsInstance.trackEvent($parameters.EventName, props)
    } catch (e) {
        console.error('Analytics tracking error:', e)
    }
}
```

---

## 🔐 Environment Variables

### Next.js (.env.local)

```env
NEXT_PUBLIC_RUDDERSTACK_KEY=your_rudderstack_key
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
```

### React with Vite (.env)

```env
VITE_RUDDERSTACK_KEY=your_rudderstack_key
VITE_POSTHOG_KEY=your_posthog_key
```

### Webflow / OutSystems

Store keys in your CMS or configuration management system, never hardcode in public scripts.

---

## 🛡️ Security Best Practices

### For NPM (Next.js, React)

✅ Use environment variables
✅ Keys prefixed with `NEXT_PUBLIC_` or `VITE_` are safe for client-side
✅ Never commit `.env` files to git

### For Scripts (Webflow, OutSystems)

⚠️ Analytics keys are publicly visible - this is expected
✅ Use domain whitelisting in RudderStack/PostHog dashboards
✅ Implement rate limiting on your analytics platform
✅ Consider using a backend proxy for sensitive operations

---

## 📊 Common Event Examples

### Track Page Views

```javascript
Analytics.pageView('homepage', {
    url: window.location.href,
    title: document.title,
})
```

### Track User Actions

```javascript
Analytics.trackEvent('form_submitted', {
    form_name: 'signup',
    form_type: 'email_signup',
    success: true,
})
```

### Track User Identity

```javascript
Analytics.identifyEvent('user_12345', {
    email: 'user@example.com',
    plan: 'premium',
})
```

### Track Errors

```javascript
window.addEventListener('error', event => {
    Analytics.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
    })
})
```

---

## 🧪 Testing

### Test in Development

```javascript
// Initialize with test mode
Analytics.initialise({
    rudderstackKey: 'TEST_KEY',
    posthogKey: 'TEST_KEY',
    // Add debug logging
}).then(() => {
    console.log('Analytics initialized')
    Analytics.trackEvent('test_event', { env: 'development' })
})
```

### Verify Events

1. **RudderStack**: Check live events in dashboard
2. **PostHog**: Use PostHog toolbar (Chrome extension)
3. **Browser Console**: Enable verbose logging

---

## ⚙️ Advanced Configuration

### Disable in Development

```typescript
if (process.env.NODE_ENV === 'production') {
    Analytics.initialise({
        /* config */
    })
}
```

### Custom User ID

```typescript
const userId = getCurrentUserId() // Your auth logic
Analytics.identifyEvent(userId)
```

### Bot Filtering

```typescript
Analytics.initialise({
    rudderstackKey: 'YOUR_KEY',
    enableBotFiltering: true, // Automatically filter bot traffic
})
```

---

## 🐛 Troubleshooting

### Issue: "DerivAnalytics is not defined" (Webflow/OutSystems)

**Solution**: Ensure script loads before your code runs

```html
<!-- Load analytics first -->
<script src="analytics.bundle.global.js"></script>
<!-- Then use it -->
<script>
    window.addEventListener('load', function () {
        const { Analytics } = window.DerivAnalytics
    })
</script>
```

### Issue: Events not showing in dashboard

**Solution**: Check initialization

```javascript
Analytics.getAnonymousId() // Should return UUID
Analytics.getInstances() // Should return { rudderstack: ..., posthog: ... }
```

### Issue: Large bundle size in Next.js

**Solution**: Use dynamic imports

```typescript
const Analytics = dynamic(() => import('@deriv-com/analytics').then(mod => mod.Analytics), { ssr: false })
```

---

## 📞 Support

For platform-specific issues:

- **Next.js**: Check Next.js documentation for client-side libraries
- **React**: Ensure you're using client-side rendering for analytics
- **Webflow**: Test in published site (not designer preview)
- **OutSystems**: Use JavaScript node for all analytics calls

For package issues:
https://github.com/binary-com/deriv-analytics/issues

---

## ✅ Compatibility Checklist

Before deploying:

- [ ] Keys configured in environment variables or secure storage
- [ ] Page view tracking implemented
- [ ] CTA buttons tracked
- [ ] Error tracking set up
- [ ] Tested in production environment
- [ ] Domain whitelisting configured in analytics dashboards
- [ ] Bot filtering enabled (if needed)

---

**Last Updated**: 2026-01-28
**Package Version**: 1.35.1+
**Browser Bundle Size**: 108 KB (gzipped) - Includes RudderStack + PostHog
