import { devices, expect, test as base, type Page } from "@playwright/test";

import { E2E_NOW, E2E_TODAY, MOCK_USER } from "../mock-supabase/fixtures.mjs";

export const MOCK_URL = "http://localhost:54329";
export const TZ = "Europe/Moscow";

/** Телефон: размеры и тач как у iPhone 13. Движок — Chromium из конфига. */
const iPhone13 = devices["iPhone 13"];
export const iPhone = {
  viewport: iPhone13.viewport,
  userAgent: iPhone13.userAgent,
  deviceScaleFactor: iPhone13.deviceScaleFactor,
  isMobile: iPhone13.isMobile,
  hasTouch: iPhone13.hasTouch,
};
/** ПК. */
export const desktop = { viewport: { width: 1440, height: 900 } };

export const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

/** «Сегодня» в тестах — 12 октября 2026 (см. E2E_NOW: 14:00 по Москве). */
export const TODAY = E2E_TODAY;
export const todayInTz = () => TODAY;

/**
 * test для e2e. Автоматически в каждом тесте: имитация Supabase сбрасывается
 * к исходным данным, ошибки консоли браузера собираются и в конце должны
 * отсутствовать. Фикстура `signedIn` — страница после входа.
 */
export const test = base.extend<{
  resetMock: void;
  fixedClock: void;
  consoleErrors: string[];
  signedIn: Page;
}>({
  resetMock: [
    async ({ request }, run) => {
      await request.post(`${MOCK_URL}/__reset`);
      await run();
    },
    { auto: true },
  ],
  // Браузерные часы = E2E_NOW (сервер получает то же время через env).
  fixedClock: [
    async ({ page }, run) => {
      await page.clock.setFixedTime(new Date(E2E_NOW));
      await run();
    },
    { auto: true },
  ],
  consoleErrors: [
    async ({ page }, run) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text().split("\n")[0]);
      });
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      await run(errors);
      expect(errors, "ошибки в консоли браузера").toEqual([]);
    },
    { auto: true },
  ],
  signedIn: async ({ page }, run) => {
    await signIn(page);
    await run(page);
  },
});

export { expect };

export async function signIn(page: Page, path = "/") {
  await page.goto(path);
  await page.getByPlaceholder("Почта").fill(MOCK_USER.email);
  await page.getByPlaceholder("Пароль").fill(MOCK_USER.password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.locator("h1")).toContainText(/\d{4}/);
  // TimeZoneSync ставит cookie tz и делает refresh — дождёмся тишины.
  await page.waitForLoadState("networkidle");
}

export const monthTitle = (page: Page) => page.locator("h1");
export const dayCell = (page: Page, label: string) =>
  page.locator(`.grid-rows-6 > button[aria-label^="${label}"]`);
export const dotsIn = (page: Page, label: string) =>
  dayCell(page, label).locator("[aria-hidden] > span");
export const sheet = (page: Page) => page.locator("dialog[open]");
export const titleInput = (page: Page) => sheet(page).getByPlaceholder("Новое событие");

/** Свайп пальцем по горизонтали через CDP (настоящие touch-события). */
export async function swipe(page: Page, fromX: number, toX: number, y: number, dy = 0) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: fromX, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: fromX + ((toX - fromX) * i) / 8, y: y + (dy * i) / 8 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

export async function mockLog(): Promise<Array<{ op: string; row: Record<string, unknown> }>> {
  return (await fetch(`${MOCK_URL}/__log`)).json();
}
