import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: false,
        setupFiles: ['./tests/setup.js'],
        include: ['tests/**/*.test.js'],
        // Each file starts its own in-memory MongoDB, so they run one at a
        // time rather than competing for ports and memory.
        fileParallelism: false,
        testTimeout: 30_000,
        hookTimeout: 120_000,
    },
})
