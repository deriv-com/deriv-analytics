// Polyfill for crypto.randomUUID in Jest environment
if (typeof crypto === 'undefined') {
    const nodeCrypto = require('crypto')
    global.crypto = {
        getRandomValues: buffer => {
            return nodeCrypto.randomFillSync(buffer)
        },
    }
}

if (!crypto.randomUUID) {
    crypto.randomUUID = () => {
        // Use cryptographically secure random values
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)

        // Set version (4) and variant bits for UUID v4
        bytes[6] = (bytes[6] & 0x0f) | 0x40
        bytes[8] = (bytes[8] & 0x3f) | 0x80

        // Convert to UUID string format
        const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
}

// Setup navigator.onLine
try {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine')
    if (!descriptor || descriptor.configurable) {
        Object.defineProperty(navigator, 'onLine', {
            writable: true,
            configurable: true,
            value: true,
        })
    }
} catch (e) {
    // navigator.onLine might already be defined and not configurable
    // In that case, we'll just use the default value
}

// Setup XMLHttpRequest if not available
if (typeof XMLHttpRequest === 'undefined') {
    global.XMLHttpRequest = class XMLHttpRequest {
        open() {}
        send() {}
        addEventListener() {}
        getAllResponseHeaders() {
            return ''
        }
    }
}
