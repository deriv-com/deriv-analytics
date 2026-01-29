import { isUUID } from '../src/utils/helpers'

describe('helpers - isUUID', () => {
    describe('Valid UUIDs', () => {
        test('should return true for valid UUID v4', () => {
            expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
        })

        test('should return true for valid UUID with uppercase letters', () => {
            expect(isUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
        })

        test('should return true for valid UUID with mixed case', () => {
            expect(isUUID('550e8400-E29b-41D4-a716-446655440000')).toBe(true)
        })

        test('should return true for UUID with all zeros', () => {
            expect(isUUID('00000000-0000-0000-0000-000000000000')).toBe(true)
        })

        test('should return true for UUID with all f characters', () => {
            expect(isUUID('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true)
        })
    })

    describe('Invalid UUIDs', () => {
        test('should return false for string without hyphens', () => {
            expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false)
        })

        test('should return false for string with wrong hyphen positions', () => {
            expect(isUUID('550e8400-e29b41-d4a7-16446655440000')).toBe(false)
        })

        test('should return false for string with invalid characters', () => {
            expect(isUUID('550e8400-e29b-41d4-a716-44665544000g')).toBe(false)
        })

        test('should return false for string that is too short', () => {
            expect(isUUID('550e8400-e29b-41d4-a716-4466554400')).toBe(false)
        })

        test('should return false for string that is too long', () => {
            expect(isUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false)
        })

        test('should return false for empty string', () => {
            expect(isUUID('')).toBe(false)
        })

        test('should return false for non-UUID string', () => {
            expect(isUUID('not-a-uuid')).toBe(false)
        })

        test('should return false for numeric string', () => {
            expect(isUUID('12345')).toBe(false)
        })

        test('should return false for UUID with spaces', () => {
            expect(isUUID('550e8400 e29b 41d4 a716 446655440000')).toBe(false)
        })

        test('should return false for regular user ID', () => {
            expect(isUUID('CR123456')).toBe(false)
        })
    })

    describe('Edge cases', () => {
        test('should return false for null input', () => {
            expect(isUUID(null as any)).toBe(false)
        })

        test('should return false for undefined input', () => {
            expect(isUUID(undefined as any)).toBe(false)
        })

        test('should return false for number input', () => {
            expect(isUUID(123 as any)).toBe(false)
        })

        test('should return false for object input', () => {
            expect(isUUID({} as any)).toBe(false)
        })
    })
})
