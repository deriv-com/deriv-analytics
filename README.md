# `@deriv/analytics`

The analytics package contains all the utility functions used for tracking user events and sending them to the respective platform such as Rudderstack and GrowthBook.

**In this document**

-   [Analytics](#analytics)
    -   [What is Analytics?](#what-is-analytics)
    -   [Installation and initialisation](#installation)
    -   [Usage](#usage)

### What is Analytics?

Cross-project, connected user tracking events with A/B testing features 

### Installation

To install the package, run the following command:

```
$ npm i @deriv/analytics
```

To proper initialisation of the package, pass proper keys in special function in special for init functions place:

```js
Analytics?.initialise({
    growthbookKey: process.env.GROWTHBOOK_CLIENT_KEY,
    growthbookDecryptionKey: process.env.GROWTHBOOK_DECRYPTION_KEY,
    enableDevMode: process.env.NODE_ENV !== 'production',
    rudderstackKey:
        process.env.NODE_ENV !== 'production'
            ? process.env.RUDDERSTACK_STAGING_KEY
            : process.env.RUDDERSTACK_PRODUCTION_KEY,
    })
```

To make good strategy for A/B testing we need to create some condition depends on data:

```js
    Analytics?.setAttributes({
        user_language: Cookies.get('user_language') || getLanguage(),
        device_language: (isBrowser() && navigator?.language) || ' ',
        device_type: isMobile ? 'mobile' : 'web',
        country:
            JSON.parse(JSON.parse(Cookies.get('website_status')).website_status).clients_country ||
            ' ',
        account_type
    })
```

And you finally can use the tracking events and A/B testing features

### Usage

To start using it, let's observe on SDK usage examples:

```js
import { Analytics, AnalyticsData } from '@deriv/analytics';

// Tracking features
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'open',
    form_source: window.location.hostname,
    form_name: 'default_diel_deriv',
    signup_provider: 'email',
})

// the same as example below, to not to add repetable properties again and again
const analyticsData: Parameters<typeof Analytics.trackEvent>[1] = {
    form_source: window.location.hostname,
    form_name: 'default_diel_deriv',
}
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'open',
    signup_provider: 'email',
    ...analyticsData
})
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'close',
    signup_provider: 'google',
    ...analyticsData
})

// A/B testing features
const test_toggle_aa_test = Analytics?.getFeatureState('test-toggle-aa-test') // returns value of experiment
const common_test = Analytics?.getFeatureValue('common-test', 'fallback') // returns feature flag's boolen
```

If you need to get entire instance or user_id directly:
```js
const { ab, tracking } = Analytics?.getInstances()
const user_id = Analytics.getId() // provide anonymous or real user id
```

