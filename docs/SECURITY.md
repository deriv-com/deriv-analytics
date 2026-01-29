# Security Policy

## Supported Versions

We actively support the following versions of @deriv-com/analytics:

| Version | Supported          |
| ------- | ------------------ |
| 1.35.x  | :white_check_mark: |
| < 1.35  | :x:                |

## Security Best Practices

### API Key Management

**IMPORTANT**: Never hardcode API keys in your application code or commit them to version control.

#### Posthog API Keys

- Users MUST provide their own Posthog API keys
- Store API keys in environment variables
- Use `.env` files (excluded from git) or secure secret management systems

```typescript
// ✅ Good: Using environment variables
const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

// ❌ Bad: Hardcoding keys
const posthogKey = 'phc_abc123...' // Never do this!
```

#### RudderStack Keys

- Store write keys in environment variables
- Never expose write keys in client-side code
- Use different keys for development and production

### Content Security Policy (CSP)

Add appropriate CSP headers to allow analytics scripts:

```
Content-Security-Policy:
  connect-src 'self' https://deriv-dataplane.rudderstack.com https://ph.deriv.com https://cdn.growthbook.io;
  script-src 'self' https://deriv-dataplane.rudderstack.com;
```

### Data Privacy

#### PII (Personally Identifiable Information)

- **Never** send passwords, credit card numbers, or sensitive personal data
- Hash email addresses before sending (library does this automatically with `cacheTrackEvents.hash()`)
- Comply with GDPR, CCPA, and other privacy regulations

#### User Consent

- Implement proper consent management before initializing analytics
- Respect "Do Not Track" browser settings
- Provide opt-out mechanisms

```typescript
// Example: Initialize only after consent
if (userConsent.analytics) {
    await Analytics.initialise({ rudderstackKey, posthogKey })
}
```

### Domain Whitelisting

Always specify allowed domains for Posthog to prevent unauthorized data collection:

```typescript
posthogOptions: {
    allowedDomains: ['yourdomain.com', 'yourapp.com'],
}
```

### Bot Filtering

Enable bot filtering to prevent fake analytics data:

```typescript
await Analytics.initialise({
    enableBotFiltering: true,
})
```

### Dependency Security

#### Audit Dependencies Regularly

```bash
npm audit
npm audit fix
```

#### Keep Dependencies Updated

```bash
npm update
npm outdated
```

#### Runtime vs Development Dependencies

- Security vulnerabilities in **devDependencies** (like semantic-release) do NOT affect the published package
- Focus on securing **dependencies** and **optionalDependencies**

### HTTPS Only

- Always use HTTPS in production
- All analytics endpoints use HTTPS by default
- Never downgrade to HTTP

### Secrets Management

#### GitHub Actions

- Use GitHub Secrets for sensitive tokens
- Never log secrets in CI/CD output
- Rotate secrets regularly

#### Local Development

```bash
# .env file (add to .gitignore)
RUDDERSTACK_KEY=your-dev-key
POSTHOG_KEY=your-dev-key
GROWTHBOOK_KEY=your-dev-key
```

```typescript
// Load from environment
import { Analytics } from '@deriv-com/analytics'

await Analytics.initialise({
    rudderstackKey: process.env.RUDDERSTACK_KEY!,
    posthogKey: process.env.POSTHOG_KEY!,
})
```

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly:

### How to Report

1. **Do NOT** create a public GitHub issue
2. Email security concerns to: [security@deriv.com](mailto:security@deriv.com)
3. Include:
    - Description of the vulnerability
    - Steps to reproduce
    - Potential impact
    - Suggested fix (if any)

### What to Expect

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
    - Critical: 1-7 days
    - High: 7-30 days
    - Medium/Low: 30-90 days

### Disclosure Policy

- We will acknowledge your contribution in the security advisory
- We follow coordinated disclosure practices
- Public disclosure only after a fix is released

## Security Features

### Built-in Security

1. **Anonymous ID Management**: Automatic, secure anonymous ID generation
2. **Cookie Security**: Secure, HttpOnly cookies where possible
3. **Domain Validation**: Posthog events filtered by allowed domains
4. **Input Sanitization**: Event data cleaned before transmission
5. **Type Safety**: TypeScript prevents many common errors

### External Dependencies

Current external dependencies (runtime):

- `@rudderstack/analytics-js`: Official RudderStack SDK
- `js-cookie`: Well-maintained cookie library (40M+ weekly downloads)
- `posthog-js`: Official Posthog SDK

Optional dependencies:

- `@growthbook/growthbook`: Official GrowthBook SDK

All dependencies are regularly audited and updated.

## Security Checklist for Users

- [ ] API keys stored in environment variables
- [ ] `.env` file in `.gitignore`
- [ ] Different keys for dev/staging/production
- [ ] Posthog `allowedDomains` configured
- [ ] CSP headers allow analytics domains
- [ ] User consent implemented
- [ ] No PII sent to analytics
- [ ] HTTPS enabled in production
- [ ] Bot filtering enabled
- [ ] Regular `npm audit` checks
- [ ] Dependencies kept up-to-date

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NPM Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [GDPR Compliance](https://gdpr.eu/)

## License

This security policy is licensed under [MIT License](LICENSE).
