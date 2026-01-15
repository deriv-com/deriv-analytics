# `@deriv-com/analytics`

A powerful, modular analytics package for tracking user events and A/B testing across your applications. Send data to RudderStack, PostHog, and GrowthBook with a simple, unified API.

## Table of Contents

- [What is Analytics?](#what-is-analytics)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
    - [Initialization](#initialization)
    - [Event Tracking](#event-tracking)
    - [A/B Testing](#ab-testing)
    - [User Identification](#user-identification)
- [Advanced Usage](#advanced-usage)
- [TypeScript Support](#typescript-support)
- [Migration Guide](#migration-guide)

---

## What is Analytics?

A cross-project analytics solution that provides:

- **Event Tracking** - Track user actions across your app
- **A/B Testing** - Run experiments with GrowthBook
- **Multi-Platform Support** - Send data to RudderStack, PostHog, or both
- **Tree-Shakeable** - Only bundle what you use
- **Type-Safe** - Full TypeScript support

---

## Features

✅ **Optional Providers** - Use any combination of RudderStack, PostHog, and GrowthBook  
✅ **Automatic Identity Management** - Consistent user tracking across platforms  
✅ **Offline Support** - Events cached when offline, sent when back online  
✅ **V1 & V2 Payload Support** - Backward compatible with existing implementations  
✅ **Tree-Shakeable** - Unused providers excluded from your bundle  
✅ **TypeScript First** - Fully typed API for better DX

---

## Installation

```bash
npm install @deriv-com/analytics
```

Or with yarn:

```bash
yarn add @deriv-com/analytics
```

---

## Quick Start

### Basic Setup (RudderStack Only)

```typescript
import { Analytics } from '@deriv-com/analytics'

// Initialize with just RudderStack
Analytics.initialise({
    rudderstackKey: process.env.RUDDERSTACK_KEY,
})

// Start tracking
Analytics.trackEvent('page_load', { page: 'home' })
```

### Full Setup (All Providers)

```typescript
import { Analytics } from '@deriv-com/analytics'

// Initialize with all providers
Analytics.initialise({
    // RudderStack (optional)
    rudderstackKey: process.env.RUDDERSTACK_KEY,

    // PostHog (optional)
    posthogKey: process.env.POSTHOG_KEY,
    posthogHost: 'https://ph.deriv.com', // optional, defaults to this

    // GrowthBook for A/B testing (optional)
    growthbookKey: process.env.GROWTHBOOK_CLIENT_KEY,
    growthbookDecryptionKey: process.env.GROWTHBOOK_DECRYPTION_KEY,

    // GrowthBook options (optional)
    growthbookOptions: {
        antiFlicker: false,
        navigateDelay: 0,
        antiFlickerTimeout: 3500,
        subscribeToChanges: true,
        enableDevMode: window?.location.hostname.includes('localhost'),
        trackingCallback: (experiment, result) => {
            console.log('Experiment viewed:', experiment.key, result.value)
        },
        attributes: {
            // Initial user attributes for targeting
            country: 'US',
            user_language: 'en',
            device_type: 'desktop',
        },
    },
})
```

---

## API Reference

### Initialization

#### `Analytics.initialise(options)`

Initialize analytics providers. All parameters are optional - use only what you need!

```typescript
type AnalyticsOptions = {
    // RudderStack
    rudderstackKey?: string

    // PostHog
    posthogKey?: string
    posthogHost?: string
    posthogConfig?: PostHogConfig

    // GrowthBook
    growthbookKey?: string
    growthbookDecryptionKey?: string
    growthbookOptions?: GrowthbookOptions
}
```

**Examples:**

```typescript
// Use only RudderStack
Analytics.initialise({
    rudderstackKey: 'YOUR_KEY',
})

// Use only PostHog
Analytics.initialise({
    posthogKey: 'YOUR_KEY',
})

// Use RudderStack + PostHog
Analytics.initialise({
    rudderstackKey: 'RUDDERSTACK_KEY',
    posthogKey: 'POSTHOG_KEY',
})

// Use all three
Analytics.initialise({
    rudderstackKey: 'RUDDERSTACK_KEY',
    posthogKey: 'POSTHOG_KEY',
    growthbookKey: 'GROWTHBOOK_KEY',
})
```

---

### Event Tracking

#### `Analytics.trackEvent(eventName, properties)`

Track user actions and events.

```typescript
// Simple event
Analytics.trackEvent('button_clicked', {
    button_name: 'sign_up',
    location: 'header',
})

// Complex event with nested data
Analytics.trackEvent('purchase_completed', {
    order_id: '12345',
    amount: 99.99,
    currency: 'USD',
    items: ['product_1', 'product_2'],
})
```

**V2 Format** (with event_metadata):

```typescript
Analytics.trackEvent('form_submitted', {
    event_metadata: {
        user_language: 'en',
        country: 'US',
    },
    cta_information: {
        form_name: 'signup_form',
        button_text: 'Create Account',
    },
})
```

#### `Analytics.pageView(pageName, platform?, properties?)`

Track page views.

```typescript
// Simple page view
Analytics.pageView('/dashboard')

// With platform and properties
Analytics.pageView('/profile', 'Deriv App', {
    section: 'settings',
    user_type: 'premium',
})
```

---

### User Identification

#### `Analytics.identifyEvent(userId?)`

Identify a user after login.

```typescript
// After successful login
Analytics.identifyEvent('user_123')

// Or let it auto-detect
Analytics.identifyEvent()
```

#### `Analytics.getId()`

Get the current user ID.

```typescript
const userId = Analytics.getId()
console.log('Current user:', userId)
```

#### `Analytics.setAttributes(attributes)`

Update user attributes for targeting and enrichment.

```typescript
Analytics.setAttributes({
    user_language: 'en',
    country: 'US',
    account_type: 'premium',
    device_type: 'mobile',
    loggedIn: true,
})
```

#### `Analytics.reset()`

Reset user identity on logout.

```typescript
// On user logout
Analytics.reset()
```

---

### A/B Testing

#### `Analytics.getFeatureValue(featureKey, defaultValue)`

Get feature flag value.

```typescript
// Boolean feature
const showNewUI = Analytics.getFeatureValue('new-ui-enabled', false)

// String feature
const buttonColor = Analytics.getFeatureValue('button-color', 'blue')

// Number feature
const maxItems = Analytics.getFeatureValue('max-items-per-page', 10)
```

#### `Analytics.isFeatureOn(featureKey)`

Check if a feature is enabled.

```typescript
if (Analytics.isFeatureOn('dark-mode')) {
    // Enable dark mode
}
```

#### `Analytics.getFeatureState(featureKey)`

Get experiment state (for multivariate tests).

```typescript
const variant = Analytics.getFeatureState('homepage-test')
// Returns: 'control' | 'variant-a' | 'variant-b' | undefined
```

#### `Analytics.getGrowthbookStatus()`

Get GrowthBook initialization status.

```typescript
const status = await Analytics.getGrowthbookStatus()
console.log('GrowthBook ready:', status)
```

#### `Analytics.setUrl(url)`

Update URL for GrowthBook targeting.

```typescript
// When route changes
Analytics.setUrl(window.location.href)
```

---

## Advanced Usage

### Get Direct Access to Provider Instances

```typescript
const { tracking, posthog, ab } = Analytics.getInstances()

// Direct access to RudderStack
tracking?.track('custom_event', { foo: 'bar' })

// Direct access to PostHog
posthog?.capture('custom_event', { foo: 'bar' })

// Direct access to GrowthBook
const features = ab?.getFeatures()
```

### Reusable Event Properties

```typescript
// Define common properties
const commonProps = {
    form_name: 'signup_form',
    form_source: 'homepage',
}

// Reuse across events
Analytics.trackEvent('form_opened', {
    action: 'open',
    ...commonProps,
})

Analytics.trackEvent('form_submitted', {
    action: 'submit',
    signup_provider: 'email',
    ...commonProps,
})
```

### TypeScript Event Types

```typescript
import { Analytics } from '@deriv-com/analytics'
import type { TAllEvents } from '@deriv-com/analytics'

// Type-safe event tracking
type SignupEvent = TAllEvents['ce_virtual_signup_form']

const trackSignup = (action: 'open' | 'close') => {
    Analytics.trackEvent('ce_virtual_signup_form', {
        action,
        form_name: 'default_signup',
        signup_provider: 'email',
    })
}
```

### Conditional Initialization

```typescript
// Initialize based on environment
if (process.env.NODE_ENV === 'production') {
    Analytics.initialise({
        rudderstackKey: process.env.RUDDERSTACK_PROD_KEY,
        posthogKey: process.env.POSTHOG_PROD_KEY,
    })
} else {
    Analytics.initialise({
        rudderstackKey: process.env.RUDDERSTACK_DEV_KEY,
    })
}
```

---

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type { AnalyticsOptions, TCoreAttributes, TAllEvents, TV2EventPayload } from '@deriv-com/analytics'

// Use in your code
const config: AnalyticsOptions = {
    rudderstackKey: 'YOUR_KEY',
}

const attributes: TCoreAttributes = {
    user_language: 'en',
    country: 'US',
}
```

---

## Migration Guide

### From Old API

The new version is **100% backward compatible**. Your existing code will continue to work:

```typescript
// Old code - still works! ✅
Analytics.initialise({
    rudderstackKey: 'KEY',
    disableRudderstackAMD: false, // This parameter is now ignored
})

Analytics.trackEvent('login', { method: 'email' })
```

### New Features Available

```typescript
// NEW: Use only the providers you need
Analytics.initialise({
    posthogKey: 'KEY', // Just PostHog, no RudderStack
})

// NEW: Multiple providers
Analytics.initialise({
    rudderstackKey: 'KEY_1',
    posthogKey: 'KEY_2',
    growthbookKey: 'KEY_3',
})
```

---

## Debugging

### Check Your Anonymous ID

```typescript
// In browser console
console.log('Anonymous ID:', Analytics.getId())
```

### Access Window Instance

```typescript
// Available globally for debugging
window.AnalyticsInstance
```
