/**
 * Performance benchmark for deriv-analytics core utility functions.
 * Run with: node benchmark.mjs
 */
import { performance } from 'node:perf_hooks'

// ─── Benchmark runner ─────────────────────────────────────────────────────────

function bench(name, fn, iterations = 200_000) {
    // Warmup: let V8 JIT-compile the function
    for (let i = 0; i < 2_000; i++) fn()

    // Force GC if available (node --expose-gc)
    if (global.gc) global.gc()

    const start = performance.now()
    for (let i = 0; i < iterations; i++) fn()
    const elapsed = performance.now() - start

    const usPerOp = (elapsed / iterations) * 1_000
    const opsPerSec = Math.round(iterations / (elapsed / 1_000)).toLocaleString()
    console.log(`  ${name.padEnd(52)} ${usPerOp.toFixed(3).padStart(8)} µs/op   (${opsPerSec} ops/s)`)
    return usPerOp
}

function section(title) {
    console.log(`\n── ${title} ${'─'.repeat(Math.max(0, 60 - title.length - 4))}`)
}

// ─── Test data ────────────────────────────────────────────────────────────────

const SHORT_EMAIL = 'user@example.com'
const LONG_EMAIL = 'very.long.email.address.for.testing@someverylongdomainname.example.com'

// Cookie strings: small (3 cookies) and large (50 cookies + target at end)
const COOKIE_SMALL = 'session=abc123; user=john; client_information=%7B%22email%22%3A%22test%40test.com%22%7D'
const COOKIE_LARGE =
    Array.from({ length: 50 }, (_, i) => `cookie_${i}=value_${i}`).join('; ') +
    '; client_information=%7B%22email%22%3A%22test%40test.com%22%7D'

const SIMPLE_OBJ = { a: 1, b: 'hello', c: null, d: undefined, e: '' }
const NESTED_OBJ = {
    action: 'click',
    event_metadata: { version: 2, user_language: 'en', country: 'US', loggedIn: true, empty: null },
    cta_information: { cta_name: 'signup', section_name: 'header', position: null, blank: '' },
}
const LARGE_OBJ = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [`key_${i}`, i % 3 === 0 ? null : `value_${i}`])
)
const DEEPLY_NESTED = {
    a: { b: { c: { d: { e: { f: 'deep', g: null }, h: '' }, i: 42 }, j: undefined } },
}

// ─── ORIGINAL implementations (verbatim from source) ─────────────────────────

function hash_ORIGINAL(inputString, desiredLength = 32) {
    // Inner functions recreated on EVERY call — this is the bug
    const fnv1aHash = (string) => {
        let hash = 0x811c9dc5
        for (let i = 0; i < string.length; i++) {
            hash ^= string.charCodeAt(i)
            hash = (hash * 0x01000193) >>> 0
        }
        return hash.toString(16)
    }
    const base64Encode = (string) => Buffer.from(string).toString('base64')

    let hash = fnv1aHash(inputString)
    let combined = base64Encode(hash)
    while (combined.length < desiredLength) {
        combined += base64Encode(fnv1aHash(combined))
    }
    return combined.substring(0, desiredLength)
}

// parseCookies: builds a full map of ALL cookies to find ONE
function parseCookies_ORIGINAL(cookieString, cookieName) {
    const cookies = cookieString.split('; ').reduce((acc, cookie) => {
        const [key, value] = cookie.split('=')
        if (key && value) {
            acc[decodeURIComponent(key)] = decodeURIComponent(value)
        }
        return acc
    }, {})
    try {
        return cookies[cookieName] ? JSON.parse(cookies[cookieName]) : null
    } catch {
        return null
    }
}

// getCookies: splits on the cookie name directly
function getCookies_ORIGINAL(cookieString, name) {
    const value = `; ${cookieString}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
        const cookieValue = decodeURIComponent(parts.pop().split(';').shift())
        try {
            return JSON.parse(cookieValue)
        } catch {
            return cookieValue
        }
    }
    return null
}

function cleanObject_ORIGINAL(obj) {
    if (obj == null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) {
        const cleanedArr = obj.map(cleanObject_ORIGINAL).filter(v => v !== undefined && v !== null)
        return cleanedArr.length ? cleanedArr : undefined
    }
    const cleaned = {}
    Object.entries(obj).forEach(([key, value]) => {
        const v = cleanObject_ORIGINAL(value)
        if (
            v === undefined ||
            v === null ||
            v === '' ||
            (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) ||
            (Array.isArray(v) && v.length === 0)
        )
            return
        cleaned[key] = v
    })
    return Object.keys(cleaned).length ? cleaned : undefined
}

function flattenObject_ORIGINAL(obj) {
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj
    const flattened = {}
    Object.entries(obj).forEach(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Object.assign creates intermediate object + copies all props — slow
            Object.assign(flattened, flattenObject_ORIGINAL(value))
        } else {
            flattened[key] = value
        }
    })
    return flattened
}

// ─── OPTIMISED implementations ────────────────────────────────────────────────

// Hoisted outside hash() — allocated once, not per-call
function _fnv1aHash(string) {
    let hash = 0x811c9dc5
    for (let i = 0; i < string.length; i++) {
        hash ^= string.charCodeAt(i)
        hash = (hash * 0x01000193) >>> 0
    }
    return hash.toString(16)
}

function hash_OPTIMISED(inputString, desiredLength = 32) {
    let combined = Buffer.from(_fnv1aHash(inputString)).toString('base64')
    while (combined.length < desiredLength) {
        combined += Buffer.from(_fnv1aHash(combined)).toString('base64')
    }
    return combined.substring(0, desiredLength)
}

// Early-exit linear scan — no full map build
function parseCookies_OPTIMISED(cookieString, cookieName) {
    const cookies = cookieString.split('; ')
    for (const cookie of cookies) {
        const eqIdx = cookie.indexOf('=')
        if (eqIdx === -1) continue
        if (decodeURIComponent(cookie.slice(0, eqIdx)) === cookieName) {
            const raw = cookie.slice(eqIdx + 1)
            try {
                return JSON.parse(decodeURIComponent(raw))
            } catch {
                return decodeURIComponent(raw)
            }
        }
    }
    return null
}

function cleanObject_OPTIMISED(obj) {
    if (obj == null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) {
        const out = []
        for (let i = 0; i < obj.length; i++) {
            const v = cleanObject_OPTIMISED(obj[i])
            if (v !== undefined && v !== null) out.push(v)
        }
        return out.length ? out : undefined
    }
    const cleaned = {}
    let hasKeys = false
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
        const v = cleanObject_OPTIMISED(obj[key])
        if (
            v === undefined ||
            v === null ||
            v === '' ||
            (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) ||
            (Array.isArray(v) && v.length === 0)
        )
            continue
        cleaned[key] = v
        hasKeys = true
    }
    return hasKeys ? cleaned : undefined
}

// Pass accumulator through recursion — no intermediate objects, no Object.assign
function _flattenInto(obj, target) {
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue
        const value = obj[key]
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            _flattenInto(value, target)
        } else {
            target[key] = value
        }
    }
}
function flattenObject_OPTIMISED(obj) {
    if (obj == null || typeof obj !== 'object' || Array.isArray(obj)) return obj
    const target = {}
    _flattenInto(obj, target)
    return target
}

// ─── Run benchmarks ───────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════════════════════════════╗')
console.log('║          deriv-analytics  •  Performance Benchmark                  ║')
console.log('╚══════════════════════════════════════════════════════════════════════╝')

const results = {}

section('hash() — email hashing (called on every event with an email)')
results.hash_short_orig = bench('ORIGINAL  hash(short email)', () => hash_ORIGINAL(SHORT_EMAIL))
results.hash_short_opt  = bench('OPTIMISED hash(short email)', () => hash_OPTIMISED(SHORT_EMAIL))
results.hash_long_orig  = bench('ORIGINAL  hash(long email)',  () => hash_ORIGINAL(LONG_EMAIL))
results.hash_long_opt   = bench('OPTIMISED hash(long email)',  () => hash_OPTIMISED(LONG_EMAIL))

section('parseCookies() — called on every push() to load existing cache')
results.parse_small_orig = bench('ORIGINAL  parseCookies(3 cookies)',  () => parseCookies_ORIGINAL(COOKIE_SMALL, 'client_information'))
results.parse_small_opt  = bench('OPTIMISED parseCookies(3 cookies)',  () => parseCookies_OPTIMISED(COOKIE_SMALL, 'client_information'))
results.parse_large_orig = bench('ORIGINAL  parseCookies(51 cookies)', () => parseCookies_ORIGINAL(COOKIE_LARGE, 'client_information'))
results.parse_large_opt  = bench('OPTIMISED parseCookies(51 cookies)', () => parseCookies_OPTIMISED(COOKIE_LARGE, 'client_information'))

section('getCookies() — called in processEvent() to read client_information')
bench('getCookies (3 cookies)',  () => getCookies_ORIGINAL(COOKIE_SMALL, 'client_information'))
bench('getCookies (51 cookies)', () => getCookies_ORIGINAL(COOKIE_LARGE, 'client_information'))

section('cleanObject() — called on every trackEvent() payload')
results.clean_simple_orig  = bench('ORIGINAL  cleanObject(simple)',       () => cleanObject_ORIGINAL(SIMPLE_OBJ))
results.clean_simple_opt   = bench('OPTIMISED cleanObject(simple)',       () => cleanObject_OPTIMISED(SIMPLE_OBJ))
results.clean_nested_orig  = bench('ORIGINAL  cleanObject(nested)',       () => cleanObject_ORIGINAL(NESTED_OBJ))
results.clean_nested_opt   = bench('OPTIMISED cleanObject(nested)',       () => cleanObject_OPTIMISED(NESTED_OBJ))
results.clean_large_orig   = bench('ORIGINAL  cleanObject(100 keys)',     () => cleanObject_ORIGINAL(LARGE_OBJ))
results.clean_large_opt    = bench('OPTIMISED cleanObject(100 keys)',     () => cleanObject_OPTIMISED(LARGE_OBJ))
results.clean_deep_orig    = bench('ORIGINAL  cleanObject(deeply nested)',() => cleanObject_ORIGINAL(DEEPLY_NESTED))
results.clean_deep_opt     = bench('OPTIMISED cleanObject(deeply nested)',() => cleanObject_OPTIMISED(DEEPLY_NESTED))

section('flattenObject() — called on every PostHog event payload')
results.flatten_simple_orig = bench('ORIGINAL  flattenObject(simple)',  () => flattenObject_ORIGINAL(SIMPLE_OBJ))
results.flatten_simple_opt  = bench('OPTIMISED flattenObject(simple)',  () => flattenObject_OPTIMISED(SIMPLE_OBJ))
results.flatten_nested_orig = bench('ORIGINAL  flattenObject(nested)',  () => flattenObject_ORIGINAL(NESTED_OBJ))
results.flatten_nested_opt  = bench('OPTIMISED flattenObject(nested)',  () => flattenObject_OPTIMISED(NESTED_OBJ))
results.flatten_deep_orig   = bench('ORIGINAL  flattenObject(deeply nested)', () => flattenObject_ORIGINAL(DEEPLY_NESTED))
results.flatten_deep_opt    = bench('OPTIMISED flattenObject(deeply nested)', () => flattenObject_OPTIMISED(DEEPLY_NESTED))

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('\n── Speedup summary ─────────────────────────────────────────────────────')
const pairs = [
    ['hash (short email)',       results.hash_short_orig,    results.hash_short_opt],
    ['hash (long email)',        results.hash_long_orig,     results.hash_long_opt],
    ['parseCookies (3 cookies)', results.parse_small_orig,   results.parse_small_opt],
    ['parseCookies (51 cookies)',results.parse_large_orig,   results.parse_large_opt],
    ['cleanObject (simple)',     results.clean_simple_orig,  results.clean_simple_opt],
    ['cleanObject (nested)',     results.clean_nested_orig,  results.clean_nested_opt],
    ['cleanObject (100 keys)',   results.clean_large_orig,   results.clean_large_opt],
    ['cleanObject (deep)',       results.clean_deep_orig,    results.clean_deep_opt],
    ['flattenObject (simple)',   results.flatten_simple_orig,results.flatten_simple_opt],
    ['flattenObject (nested)',   results.flatten_nested_orig,results.flatten_nested_opt],
    ['flattenObject (deep)',     results.flatten_deep_orig,  results.flatten_deep_opt],
]
for (const [label, orig, opt] of pairs) {
    const speedup = orig / opt
    const pct     = ((1 - opt / orig) * 100).toFixed(1)
    const arrow   = speedup >= 1 ? '▲' : '▼'
    console.log(
        `  ${label.padEnd(30)} ${arrow} ${speedup.toFixed(2)}x faster  (${pct}% reduction in µs/op)`
    )
}
console.log()
