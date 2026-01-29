// Polyfill for crypto.randomUUID in Jest environment
if (typeof crypto === 'undefined') {
    global.crypto = {}
}

if (!crypto.randomUUID) {
    crypto.randomUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0
            const v = c === 'x' ? r : (r & 0x3) | 0x8
            return v.toString(16)
        })
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
