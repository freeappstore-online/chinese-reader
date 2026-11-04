import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser', timeout: 45000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:5183', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } }],
  webServer: { command: 'pnpm --filter @chinese-reader/web dev --host 127.0.0.1 --port 5183 --strictPort', url: 'http://127.0.0.1:5183', reuseExistingServer: false, timeout: 60000 },
})
