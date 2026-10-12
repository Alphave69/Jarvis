import { defineConfig } from "@playwright/test";

import { E2E_NOW } from "./tests/mock-supabase/fixtures.mjs";

const MOCK_PORT = 54329;
const APP_PORT = 3100;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  projects: [
    // npm test — чистые функции, без браузера и сервера, ~секунда.
    {
      name: "unit",
      testDir: "./tests/unit",
    },
    // npm run test:e2e — браузер против production-сборки и имитации Supabase.
    {
      name: "e2e",
      testDir: "./tests/e2e",
      // Имитация Supabase хранит состояние в памяти — тесты по одному.
      fullyParallel: false,
      use: {
        baseURL: `http://localhost:${APP_PORT}`,
        browserName: "chromium",
        timezoneId: "Europe/Moscow",
        locale: "ru-RU",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
      },
    },
  ],
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Серверы нужны только e2e; для `--project=unit` Playwright их тоже поднимет,
  // поэтому npm test запускается с PW_NO_SERVER=1 (см. package.json).
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : [
        {
          command: "node tests/mock-supabase/server.mjs",
          url: `http://localhost:${MOCK_PORT}/__health`,
          env: { MOCK_SUPABASE_PORT: String(MOCK_PORT) },
          reuseExistingServer: false,
        },
        {
          // Отдельная папка сборки (.next-test), чтобы не мешать `npm run dev`.
          // Переменные процесса важнее .env.local — приложение пойдёт в имитацию.
          command: `npx next build && npx next start -p ${APP_PORT}`,
          url: `http://localhost:${APP_PORT}/login`,
          env: {
            NEXT_DIST_DIR: ".next-test",
            // «Сейчас» для сервера; браузеру то же время ставит page.clock.
            E2E_NOW,
            NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK_PORT}`,
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_mock",
          },
          timeout: 240_000,
          reuseExistingServer: false,
          stdout: "ignore",
          stderr: "pipe",
        },
      ],
});
