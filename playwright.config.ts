import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.pw.spec.ts',
  timeout: 60000,
  use: {
    baseURL: process.env.BASE_URL || `http://localhost:${process.env.PORT || '5000'}`,
    headless: true,
  },
});
