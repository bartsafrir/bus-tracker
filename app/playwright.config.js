import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 390, height: 844 },
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    geolocation: { latitude: 32.794, longitude: 34.990 }, // Haifa
    permissions: ['geolocation'],
  },
  webServer: {
    command: 'npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'mobile', use: { ...{ isMobile: true } } },
  ],
});
