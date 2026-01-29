# Installation Guide

Complete installation guide for @deriv-com/analytics v1.35.1

## Prerequisites

- Node.js >= 18.19.0
- npm >= 9.0.0
- Modern browser supporting ES2020

## Installation

### 1. Install Core Package

```bash
npm install @deriv-com/analytics
```

This installs the core analytics package with RudderStack support.

### 2. Install Optional Dependencies

#### For A/B Testing (GrowthBook)

```bash
npm install @growthbook/growthbook
```

#### For Product Analytics (Posthog)

```bash
npm install posthog-js
```

**Note**: You must provide your own Posthog API key.

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```bash
# Required for RudderStack
RUDDERSTACK_KEY=your_rudderstack_write_key

# Optional: Posthog (if using)
POSTHOG_KEY=your_posthog_api_key

# Optional: GrowthBook (if using)
GROWTHBOOK_KEY=your_growthbook_client_key
GROWTHBOOK_DECRYPTION_KEY=your_decryption_key
```

**Important**: Add `.env` to your `.gitignore`!

### TypeScript Configuration

If using TypeScript, ensure your `tsconfig.json` includes:

```json
{
    "compilerOptions": {
        "moduleResolution": "bundler",
        "esModuleInterop": true,
        "skipLibCheck": true
    }
}
```

## Framework-Specific Setup

### React

```typescript
// App.tsx or _app.tsx
import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

function App() {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.REACT_APP_RUDDERSTACK_KEY!,
            posthogKey: process.env.REACT_APP_POSTHOG_KEY,
            enableBotFiltering: true,
        })
    }, [])

    return <YourApp />
}
```

### Next.js (App Router)

```typescript
// app/providers.tsx
'use client'

import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        })
    }, [])

    return <>{children}</>
}

// app/layout.tsx
import { AnalyticsProvider } from './providers'

export default function RootLayout({ children }) {
    return (
        <html>
            <body>
                <AnalyticsProvider>{children}</AnalyticsProvider>
            </body>
        </html>
    )
}
```

### Next.js (Pages Router)

```typescript
// pages/_app.tsx
import { Analytics } from '@deriv-com/analytics'
import { useEffect } from 'react'
import type { AppProps } from 'next/app'

export default function App({ Component, pageProps }: AppProps) {
    useEffect(() => {
        Analytics.initialise({
            rudderstackKey: process.env.NEXT_PUBLIC_RUDDERSTACK_KEY!,
            posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
        })
    }, [])

    return <Component {...pageProps} />
}
```

### Vue 3

```typescript
// plugins/analytics.ts
import { Analytics } from '@deriv-com/analytics'

export default {
    install(app: any) {
        Analytics.initialise({
            rudderstackKey: import.meta.env.VITE_RUDDERSTACK_KEY,
            posthogKey: import.meta.env.VITE_POSTHOG_KEY,
        })

        app.config.globalProperties.$analytics = Analytics
    },
}

// main.ts
import { createApp } from 'vue'
import analyticsPlugin from './plugins/analytics'

const app = createApp(App)
app.use(analyticsPlugin)
```

### Vanilla JavaScript

```html
<!-- index.html -->
<script type="module">
    import { Analytics } from '@deriv-com/analytics'

    Analytics.initialise({
        rudderstackKey: 'YOUR_KEY',
        posthogKey: 'YOUR_POSTHOG_KEY',
    }).then(() => {
        console.log('Analytics initialized')

        // Track page view
        Analytics.pageView(window.location.pathname)
    })
</script>
```

## Webpack Configuration

If using Webpack, ensure tree-shaking is enabled:

```javascript
// webpack.config.js
module.exports = {
    optimization: {
        usedExports: true,
        sideEffects: false,
    },
}
```

## Vite Configuration

Vite works out of the box with this package. No special configuration needed.

## Bundle Size Optimization

### Import Only What You Need

```typescript
// ❌ Bad: Imports everything
import { Analytics } from '@deriv-com/analytics'

// ✅ Good: Same as above (Analytics is the default export)
import { Analytics } from '@deriv-com/analytics'

// ✅ Better: Independent usage
import { Posthog } from '@deriv-com/analytics/posthog'
import { Growthbook } from '@deriv-com/analytics/growthbook'
```

### Tree-Shaking Verification

Check what's being bundled:

```bash
# With webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# With source-map-explorer
npx source-map-explorer dist/main.*.js
```

## Troubleshooting

### Module Resolution Errors

If you get "Cannot find module" errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

If TypeScript can't find types:

```bash
# Ensure types are installed
npm install --save-dev @types/node
```

### Build Errors

If the build fails:

1. Check Node.js version: `node --version` (must be >= 18.19.0)
2. Update npm: `npm install -g npm@latest`
3. Clear cache: `npm cache clean --force`

### Runtime Errors

#### "Analytics is not defined"

Ensure you've initialized Analytics before using it:

```typescript
await Analytics.initialise({ rudderstackKey: '...' })
// Now you can use Analytics.trackEvent()
```

#### "Cannot read property 'trackEvent' of undefined"

Analytics initialization is async. Wrap calls in useEffect or after await:

```typescript
useEffect(() => {
    Analytics.initialise({ rudderstackKey: '...' }).then(() => {
        Analytics.trackEvent('page_loaded', { page: '/' })
    })
}, [])
```

## Testing

### Mocking in Tests

```typescript
// analytics.mock.ts
export const Analytics = {
    initialise: jest.fn(),
    trackEvent: jest.fn(),
    pageView: jest.fn(),
    identifyEvent: jest.fn(),
    reset: jest.fn(),
}

// component.test.tsx
import { Analytics } from '@deriv-com/analytics'

jest.mock('@deriv-com/analytics')

test('tracks event on click', () => {
    render(<Button />)
    fireEvent.click(screen.getByRole('button'))
    expect(Analytics.trackEvent).toHaveBeenCalledWith('button_click', {
        button_name: 'submit',
    })
})
```

## Production Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] API keys are production keys (not dev)
- [ ] `.env` file is in `.gitignore`
- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] User consent implemented
- [ ] Bot filtering enabled
- [ ] Tested in staging environment
- [ ] Bundle size verified
- [ ] No console errors in production build

## Next Steps

- Read the [README.md](README.md) for API documentation
- Review [SECURITY.md](SECURITY.md) for security best practices
- Check examples in the [documentation](#)

## Support

- GitHub Issues: https://github.com/binary-com/deriv-analytics/issues
- Documentation: https://github.com/binary-com/deriv-analytics

## Version History

### v1.35.1 (Current)

- Posthog integration
- Performance optimizations
- Tree-shakeable architecture
- Comprehensive caching utilities

See [CHANGELOG.md](CHANGELOG.md) for full history.
