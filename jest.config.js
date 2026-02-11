/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: '<rootDir>/jest-custom-env.js',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironmentOptions: {
        url: 'http://app.deriv.com/',
    },
    collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.spec.ts', '!src/**/*.test.ts'],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'clover'],
}
