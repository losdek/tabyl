import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/**
 * End-to-end tests run a production build against a throwaway database
 * (.data/e2e), wiped by the webServer command before each run.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, locale: "ru-RU", timezoneId: "Asia/Bishkek", trace: "retain-on-failure" },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: `rm -rf .data/e2e .data/e2e-storage && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      TABYL_E2E: "1",
      TABYL_DB_DIR: ".data/e2e",
      TABYL_STORAGE_DIR: ".data/e2e-storage",
      TABYL_ADMIN_PHONES: "+996700999999",
      TABYL_ORIGIN: `http://localhost:${PORT}`,
    },
  },
});
