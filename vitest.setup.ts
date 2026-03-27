import { vi } from 'vitest'

// Polyfill localStorage with full Storage API (vitest v3 jsdom omits .clear())
const createStorage = () => {
    let store: Record<string, string> = {}
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = String(value)
        },
        removeItem: (key: string) => {
            delete store[key]
        },
        clear: () => {
            store = {}
        },
        get length() {
            return Object.keys(store).length
        },
        key: (index: number) => Object.keys(store)[index] ?? null,
    }
}
Object.defineProperty(globalThis, 'localStorage', { value: createStorage(), writable: true, configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: createStorage(), writable: true, configurable: true })

// Polyfill for crypto.randomUUID in jsdom environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    Object.defineProperty(globalThis, 'crypto', {
        value: {
            getRandomValues: (buffer: Uint8Array) => {
                for (let i = 0; i < buffer.length; i++) {
                    buffer[i] = Math.floor(Math.random() * 256)
                }
                return buffer
            },
            randomUUID: (): `${string}-${string}-${string}-${string}-${string}` => {
                const bytes = new Uint8Array(16)
                crypto.getRandomValues(bytes)
                bytes[6] = (bytes[6] & 0x0f) | 0x40
                bytes[8] = (bytes[8] & 0x3f) | 0x80
                const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
                return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`
            },
        },
        writable: true,
        configurable: true,
    })
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
} catch {
    // navigator.onLine might already be defined and not configurable
}

// Setup XMLHttpRequest if not available
if (typeof XMLHttpRequest === 'undefined') {
    ;(globalThis as any).XMLHttpRequest = class XMLHttpRequest {
        open() {}
        send() {}
        addEventListener() {}
        getAllResponseHeaders() {
            return ''
        }
    }
}
