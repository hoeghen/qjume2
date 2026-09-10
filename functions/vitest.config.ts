import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Set before any module loads, so the Admin SDK initialises against the
    // emulator rather than looking for credentials.
    env: {
      GOOGLE_CLOUD_PROJECT: 'qjume-local',
      GCLOUD_PROJECT: 'qjume-local',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    },
    // The concurrency tests contend on the same documents by design; running
    // files in parallel would make failures ambiguous.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
