## [1.40.2](https://github.com/deriv-com/deriv-analytics/compare/v1.40.1...v1.40.2) (2026-04-08)

### ♻️ Chores

- remove posthog_excluded_keys filtering from PostHog event tracking ([269c032](https://github.com/deriv-com/deriv-analytics/commit/269c032be9324dd3f49bc06c36b67abfc6ac6dd1))
- remove posthog_excluded_keys filtering from trackEvent ([9616469](https://github.com/deriv-com/deriv-analytics/commit/96164695685332551506344e75f980c36121b71b))

## [1.40.1](https://github.com/deriv-com/deriv-analytics/compare/v1.40.0...v1.40.1) (2026-04-07)

### ♻️ Chores

- update packages to latest and backfill changelog from v1.37.0 ([ccb2701](https://github.com/deriv-com/deriv-analytics/commit/ccb2701b6861f9d66a6fa1f22c8f92690e6306c2))
- update packages to latest and backfill changelog from v1.37.0 ([3622cd1](https://github.com/deriv-com/deriv-analytics/commit/3622cd1a8a29dc094a06c00d24fb63d2bba23230))

### 🐛 Bug Fixes

- resolve test failures after package upgrades ([cb30d62](https://github.com/deriv-com/deriv-analytics/commit/cb30d627c453b580fbb6a93f1fe2970bc389b521))

# [1.40.0](https://github.com/deriv-com/deriv-analytics/compare/v1.39.8...v1.40.0) (2026-04-01)

### ♻️ Chores

- add language to backfillPersonProperties ([4fa319b](https://github.com/deriv-com/deriv-analytics/commit/4fa319b3b48cae0d468cd260f6a463a7dc348733))

### ✨ Features

- add language to backfillPersonProperties ([04cec68](https://github.com/deriv-com/deriv-analytics/commit/04cec6835bb4683e90733ddd6cf55e3c9049a2a1))

## [1.39.8](https://github.com/deriv-com/deriv-analytics/compare/v1.39.7...v1.39.8) (2026-04-01)

### 📦 Code Refactoring

- remove analytics cache and strict event types ([bb7d3ed](https://github.com/deriv-com/deriv-analytics/commit/bb7d3ed6c1abd0eec0ccbef3cb85360ffd65d99f))
- remove analytics cache and strict types, migrate to Vitest, pin action versions ([8a82fee](https://github.com/deriv-com/deriv-analytics/commit/8a82fee8f376d90da8f11cc37280d64b542910ca))

## [1.39.7](https://github.com/deriv-com/deriv-analytics/compare/v1.39.6...v1.39.7) (2026-03-27)

### 🐛 Bug Fixes

- security issue ([abe6ce9](https://github.com/deriv-com/deriv-analytics/commit/abe6ce9))
- security issue ([0bd3e75](https://github.com/deriv-com/deriv-analytics/commit/0bd3e75))

## [1.39.6](https://github.com/deriv-com/deriv-analytics/compare/v1.39.5...v1.39.6) (2026-03-13)

### 🐛 Bug Fixes

- clean up cookie naming, reduce RudderStack cookie TTL, and purge stale PostHog cookies ([74ad1ac](https://github.com/deriv-com/deriv-analytics/commit/74ad1ac))
- resolve TS2345 error in cleanupStalePosthogCookies ([c060e47](https://github.com/deriv-com/deriv-analytics/commit/c060e47))
- guard window in cleanupStalePosthogCookies SSR check ([97b1451](https://github.com/deriv-com/deriv-analytics/commit/97b1451))
- accurate cookie deletion logging, TTL constant, test file rename, and TLD comment ([60a1ef7](https://github.com/deriv-com/deriv-analytics/commit/60a1ef7))

### ♻️ Chores

- upgrade posthog-js to 1.360.1 and fix audit vulnerabilities ([79da9b9](https://github.com/deriv-com/deriv-analytics/commit/79da9b9))

## [1.39.5](https://github.com/deriv-com/deriv-analytics/compare/v1.39.4...v1.39.5) (2026-03-13)

### 🐛 Bug Fixes

- migrate analytics cache from cookies to localStorage ([fc56b72](https://github.com/deriv-com/deriv-analytics/commit/fc56b72))
- add SSR guards to clearCachedEvents and clearCachedPageViews ([b12d14f](https://github.com/deriv-com/deriv-analytics/commit/b12d14f))

### 📦 Code Refactoring

- rename parseCookies to parseFromLocalStorage and clean up cookie.spec.ts ([455dcaf](https://github.com/deriv-com/deriv-analytics/commit/455dcaf))

## [1.39.4](https://github.com/deriv-com/deriv-analytics/compare/v1.39.3...v1.39.4) (2026-03-05)

### ♻️ Chores

- add deriv.ae PostHog host and update posthog-js to 1.358.0 ([395853c](https://github.com/deriv-com/deriv-analytics/commit/395853c))

## [1.39.3](https://github.com/deriv-com/deriv-analytics/compare/v1.39.2...v1.39.3) (2026-03-03)

### 🐛 Bug Fixes

- strip query string from cached_analytics_page_views cookie ([63ed9d9](https://github.com/deriv-com/deriv-analytics/commit/63ed9d9))

## [1.39.2](https://github.com/deriv-com/deriv-analytics/compare/v1.39.1...v1.39.2) (2026-03-02)

### 🐛 Bug Fixes

- centralize PII sanitization in identifyEvent for all providers ([349a80c](https://github.com/deriv-com/deriv-analytics/commit/349a80c))

## [1.39.1](https://github.com/deriv-com/deriv-analytics/compare/v1.39.0...v1.39.1) (2026-03-02)

### ♻️ Chores

- upgrade posthog-js to ^1.356.1 ([287431d](https://github.com/deriv-com/deriv-analytics/commit/287431d))

# [1.39.0](https://github.com/deriv-com/deriv-analytics/compare/v1.38.10...v1.39.0) (2026-03-02)

### ✨ Features

- enhance PostHog configs with domain-aware API host and extended person properties ([e47d43c](https://github.com/deriv-com/deriv-analytics/commit/e47d43c))

## [1.38.10](https://github.com/deriv-com/deriv-analytics/compare/v1.38.9...v1.38.10) (2026-02-27)

### ♻️ Chores

- fix claude code review CI issue ([fefc412](https://github.com/deriv-com/deriv-analytics/commit/fefc412))

## [1.38.9](https://github.com/deriv-com/deriv-analytics/compare/v1.38.8...v1.38.9) (2026-02-27)

### ♻️ Chores

- add is_internal flag to PostHog identification based on email domain ([22912b7](https://github.com/deriv-com/deriv-analytics/commit/22912b7))
- added debug feature to the analytics package ([11e4f9f](https://github.com/deriv-com/deriv-analytics/commit/11e4f9f))
- added setClientId fn for posthog ([0f9d1cb](https://github.com/deriv-com/deriv-analytics/commit/0f9d1cb))
- made email field optional ([42c960c](https://github.com/deriv-com/deriv-analytics/commit/42c960c))
- renamed backfil fn ([69642cb](https://github.com/deriv-com/deriv-analytics/commit/69642cb))

### 📦 Code Refactoring

- improved helper functions ([ed65bad](https://github.com/deriv-com/deriv-analytics/commit/ed65bad))

## [1.38.8](https://github.com/deriv-com/deriv-analytics/compare/v1.38.7...v1.38.8) (2026-02-20)

### ♻️ Chores

- updated posthog config ([bf688dc](https://github.com/deriv-com/deriv-analytics/commit/bf688dc))

## [1.38.7](https://github.com/deriv-com/deriv-analytics/compare/v1.38.6...v1.38.7) (2026-02-19)

### ♻️ Chores

- added pageview config for posthog ([3a44d04](https://github.com/deriv-com/deriv-analytics/commit/3a44d04))

## [1.38.6](https://github.com/deriv-com/deriv-analytics/compare/v1.38.5...v1.38.6) (2026-02-13)

### 🐛 Bug Fixes

- fix rudderstack userId and remove batching ([993e83b](https://github.com/deriv-com/deriv-analytics/commit/993e83b))

## [1.38.5](https://github.com/deriv-com/deriv-analytics/compare/v1.38.4...v1.38.5) (2026-02-12)

### 🐛 Bug Fixes

- fix error when calling identify ([24fa837](https://github.com/deriv-com/deriv-analytics/commit/24fa837))

## [1.38.4](https://github.com/deriv-com/deriv-analytics/compare/v1.38.3...v1.38.4) (2026-02-12)

### 🐛 Bug Fixes

- fix the domain for localhost ([4a078d5](https://github.com/deriv-com/deriv-analytics/commit/4a078d5))

## [1.38.3](https://github.com/deriv-com/deriv-analytics/compare/v1.38.0...v1.38.3) (2026-02-11)

### 🐛 Bug Fixes

- security issue ([4f85d85](https://github.com/deriv-com/deriv-analytics/commit/4f85d85))
- prevent semantic-release branch conflict issue ([f26f897](https://github.com/deriv-com/deriv-analytics/commit/f26f897))

# [1.38.0](https://github.com/deriv-com/deriv-analytics/compare/v1.37.0...v1.38.0) (2026-02-11)

### ✨ Features

- add configurable PostHog api_host and enhance security ([8d58821](https://github.com/deriv-com/deriv-analytics/commit/8d58821))
