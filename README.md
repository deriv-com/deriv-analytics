# `@deriv-com/analytics`

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
$ npm i @deriv-com/analytics
```

To proper initialisation of the package, pass proper keys in special function in special for init functions place:

```js
Analytics?.initialise({
    growthbookKey: process.env.GROWTHBOOK_CLIENT_KEY, // optional key to enable A/B tests
    growthbookDecryptionKey: process.env.GROWTHBOOK_DECRYPTION_KEY, // optional key to enable A/B tests
    // mandatory key to enable userevent tracking
    rudderstackKey: RUDDERSTACK_KEY,

    growthbookOptions: {
        // optional options for overriding growthbook default options
        // if you want e.g
        antiFlicker: false,
        navigateDelay: 0,
        antiFlickerTimeout: 3500,
        subscribeToChanges: true,
        enableDevMode: window?.location.hostname.includes('localhost'),
        trackingCallback: (experiment, result) => {
            console.log('Tracking callback', experiment, result)
        }
        navigate: (url) => window.location.href = url,
    }
})
```

To make good strategy for A/B testing we need to create some condition depends on data:

```js
Analytics?.setAttributes({
    user_language: getLanguage(),
    device_language: navigator?.language,
    country: this.country,
})
```

And you finally can use the tracking events and A/B testing features

### Usage

To start using it, let's observe on SDK usage examples:

```js
import { Analytics } from '@deriv-com/analytics';

// Tracking features:
Analytics?.identifyEvent() // inentify the user
Analytics?.pageView() // track that page is showed for user
const user_id = Analytics?.getId() // get an user anon or real id


// Track Event
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'open',
    form_name: 'default_diel_deriv',
    form_source: document?.referrer,
    signup_provider: 'email',
})

// the same as example below, to not to add repetable properties again and again
const analytics_data: Parameters<typeof Analytics.trackEvent>[1] = {
    form_name: 'default_diel_deriv',
}
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'open',
    signup_provider: 'email',
    ...analytics_data
})
Analytics?.trackEvent('ce_virtual_signup_form', {
    action: 'close',
    signup_provider: 'google',
    ...analytics_data
})

// A/B testing features
const test_toggle_aa_test = Analytics?.getFeatureState('test-toggle-aa-test') // returns value of experiment
const common_test = Analytics?.getFeatureValue('common-test', 'fallback') // returns feature flag's boolen
```

If you need to get entire instance directly:

```js
const { ab, tracking } = Analytics?.getInstances()
```

If you want to check your ID

```js
window.getMyId()
```
