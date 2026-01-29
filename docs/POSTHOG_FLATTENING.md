# PostHog Event Flattening

## Overview

PostHog events are automatically flattened to provide clean, top-level properties without nested prefixes. This makes events easier to query and analyze in PostHog dashboards.

The flattening is **flexible** and supports any data structure consumers send.

## Flattening Behavior

### Special Keys (Automatically Merged)

The following nested objects are **flattened and merged** to the top level without any prefixes:

1. **`cta_information`** - Call-to-action tracking data
2. **`event_metadata`** - Event metadata
3. **`error`** - Error information

**All fields** within these objects are flattened to the top level. There are **no exclusions** - consumers have full control over what they send.

## Examples

### Example 1: Click Event with CTA

**Input:**

```javascript
analytics.trackEvent('button_clicked', {
    action: 'click',
    cta_information: {
        cta_name: 'signup_button',
        section_name: 'hero_section',
        container_name: 'main_container',
    },
    event_metadata: {
        version: 2,
        account_type: 'real',
        page_name: 'https://app.deriv.com/home',
        user_language: 'en',
        device_type: 'desktop',
        marketing_data: { utm_source: 'google' },
        is_profile_completed: true,
        country_of_residence: 'US',
    },
    form_name: 'deriv_home_web',
})
```

**PostHog Output:**

```javascript
{
    action: 'click',
    cta_name: 'signup_button',              // ✅ From cta_information
    section_name: 'hero_section',            // ✅ From cta_information
    container_name: 'main_container',        // ✅ From cta_information
    version: 2,                              // ✅ From event_metadata
    account_type: 'real',                    // ✅ From event_metadata
    page_name: 'https://app.deriv.com/home', // ✅ From event_metadata
    user_language: 'en',                     // ✅ From event_metadata
    device_type: 'desktop',                  // ✅ From event_metadata
    marketing_data: { utm_source: 'google' }, // ✅ From event_metadata
    is_profile_completed: true,              // ✅ From event_metadata
    country_of_residence: 'US',              // ✅ From event_metadata
    form_name: 'deriv_home_web'              // ✅ Top-level field
}
```

### Example 2: Error Event

**Input:**

```javascript
analytics.trackEvent('form_error', {
    action: 'submit',
    event_metadata: {
        version: 2,
        user_language: 'es',
        device_type: 'mobile',
        country_of_residence: 'BR',
    },
    error: {
        error_code: '400',
        error_message: 'Invalid input',
    },
    form_name: 'signup_form',
})
```

**PostHog Output:**

```javascript
{
    action: 'submit',
    version: 2,                              // ✅ From event_metadata
    user_language: 'es',                     // ✅ From event_metadata
    device_type: 'mobile',                   // ✅ From event_metadata
    country_of_residence: 'BR',              // ✅ From event_metadata
    error_code: '400',                       // ✅ From error
    error_message: 'Invalid input',          // ✅ From error
    form_name: 'signup_form'                 // ✅ Top-level field
}
```

### Example 3: Flexible Consumer Structure

**Input:**

```javascript
analytics.trackEvent('trade_completed', {
    event_type: 'trade_completed',
    cta_information: {
        button_id: 'trade_btn_123',
        position: 'top',
    },
    event_metadata: {
        trade_type: 'forex',
        trade_amount: 1000,
        currency: 'USD',
        platform: 'web',
    },
    custom_tracking: {
        session_id: 'abc123',
        feature_flags: ['new_ui', 'beta_features'],
    },
})
```

**PostHog Output:**

```javascript
{
    event_type: 'trade_completed',           // ✅ Top-level field
    button_id: 'trade_btn_123',              // ✅ From cta_information
    position: 'top',                         // ✅ From cta_information
    trade_type: 'forex',                     // ✅ From event_metadata
    trade_amount: 1000,                      // ✅ From event_metadata
    currency: 'USD',                         // ✅ From event_metadata
    platform: 'web',                         // ✅ From event_metadata
    custom_tracking: {                       // ✅ Preserved (not a special key)
        session_id: 'abc123',
        feature_flags: ['new_ui', 'beta_features']
    }
}
```

## Non-Special Keys

Nested objects that are **NOT** special keys (`cta_information`, `event_metadata`, `error`) are preserved as-is:

**Input:**

```javascript
{
    action: 'custom_action',
    custom_data: {
        nested: {
            deeply: 'value'
        }
    },
    event_metadata: {
        user_language: 'ja'
    }
}
```

**PostHog Output:**

```javascript
{
    action: 'custom_action',
    custom_data: {                           // ✅ Kept as nested object
        nested: {
            deeply: 'value'
        }
    },
    user_language: 'ja'
}
```

## Arrays

Arrays are **always preserved** as-is:

**Input:**

```javascript
{
    action: 'multi_select',
    selected_items: ['option1', 'option2', 'option3'],
    event_metadata: {
        user_language: 'en'
    }
}
```

**PostHog Output:**

```javascript
{
    action: 'multi_select',
    selected_items: ['option1', 'option2', 'option3'],  // ✅ Array preserved
    user_language: 'en'
}
```

## Benefits

1. **Cleaner PostHog Queries** - No prefixed keys like `cta_information_cta_name`
2. **Better Insights Dashboard** - Properties appear at top level
3. **Easier Filtering** - Query by `cta_name` instead of `cta_information_cta_name`
4. **Flexible Data Models** - Consumers control what fields to send
5. **Consistent Naming** - All properties follow same flat structure
6. **Zero Configuration** - Works automatically with any data structure

## Implementation

The flattening logic is implemented in:

- **File:** `src/providers/posthog/posthog.ts`
- **Method:** `private flattenObject()`
- **Tests:** `__tests__/posthog-flattening.spec.ts`

## Testing

To verify the flattening behavior:

```bash
npm test -- posthog-flattening.spec.ts
```

All 9 test cases should pass, verifying:

- ✅ CTA information flattening
- ✅ Event metadata flattening (all fields included)
- ✅ Error information flattening
- ✅ Conditional fields handling
- ✅ Array preservation
- ✅ Non-special nested objects preserved
- ✅ Flexible consumer data structures
