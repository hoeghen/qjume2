import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The app workspace holds only the security-rules suite; the Cloud
    // Functions tests run from functions/ against their own config.
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
