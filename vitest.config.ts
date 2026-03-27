import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://app.deriv.com/',
            },
        },
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.d.ts', 'src/**/*.spec.ts', 'src/**/*.test.ts'],
            reporter: ['text', 'lcov', 'html', 'clover'],
            reportsDirectory: 'coverage',
        },
    },
})
