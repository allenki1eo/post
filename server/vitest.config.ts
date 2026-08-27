import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/global-setup.ts',
    setupFiles: ['./test/setup.ts'],
    // One database, shared: run files in sequence rather than fighting over it.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
