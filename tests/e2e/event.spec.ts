import { dayCell, desktop, expect, iPhone, sheet, test } from "./helpers";

const rows = (page: Parameters<typeof sheet>[0]) => sheet(page).locator("button[data-event-id]");
const card = (page: Parameters<typeof sheet>[0]) => sheet(page).locator("article");

test.describe("телефон", () => {
  test.use(iPhone);

  test("сегодня: прошедшие тусклые, линия «сейчас» между прошлым и будущим", async ({ signedIn: page }) => {
    // «Сейчас» в тестах — 12 октября 2026, 14:00 МСК
    await page.goto("/?m=2026-10");
    await dayCell(page, "12 октября").click();
    await expect(rows(page)).toHaveCount(3);
    const nowLine = sheet(page).locator("[data-now-line]");
    await expect(nowLine).toHaveAttribute("aria-label", "Сейчас 14:00");

    // порядок: Событие 1 (весь день), Событие 2 (10–11, прошло), — сейчас —, Событие 3 (15:00)
    const items = sheet(page).locator("ul > li");
    await expect(items.nth(0)).toContainText("Событие 1");
    await expect(items.nth(1)).toContainText("Событие 2");
    await expect(items.nth(2)).toHaveAttribute("data-now-line");
    await expect(items.nth(3)).toContainText("Событие 3");

    await expect(rows(page).nth(0), "весь день не «прошёл»").not.toHaveAttribute("data-past", /.*/);
    await expect(rows(page).nth(1)).toHaveAttribute("data-past", "true");
    await expect(rows(page).nth(2)).not.toHaveAttribute("data-past", /.*/);
  });

  test("не сегодня — без линии «сейчас» и без тусклых", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10&d=2026-10-14");
    await expect(rows(page)).toHaveCount(4);
    await expect(sheet(page).locator("[data-now-line]")).toHaveCount(0);
    await expect(sheet(page).locator("[data-past]")).toHaveCount(0);
  });

  test("тап по событию → карточка; «‹» назад к дню; ✕ закрывает всё", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "12 октября").click();
    await rows(page).filter({ hasText: "Событие 2" }).click();

    await expect(card(page).locator("h3")).toHaveText("Событие 2");
    await expect(page).toHaveURL(/\?m=2026-10&d=2026-10-12&e=fx-2$/);
    await expect(card(page)).toContainText("Понедельник, 12 октября 2026");
    await expect(card(page)).toContainText("10:00 – 11:00");
    await expect(card(page)).not.toContainText("Напомин"); // напоминания нет
    await expect(sheet(page).getByPlaceholder("Новое событие"), "форма дня спрятана").toBeHidden();

    await sheet(page).getByRole("button", { name: "12 октября" }).click(); // «‹ 12 октября»
    await expect(card(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(3);
    await expect(page).toHaveURL(/\?m=2026-10&d=2026-10-12$/);
    await expect(rows(page).filter({ hasText: "Событие 2" }), "фокус вернулся на строку").toBeFocused();

    await rows(page).filter({ hasText: "Событие 1" }).click();
    await expect(card(page)).toContainText("Весь день");
    await expect(card(page)).toContainText("Накануне в 20:00");
    await sheet(page).getByRole("button", { name: "Закрыть" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page).toHaveURL(/\/(\?m=2026-10)?$/);

    // история не «перелетела»: Назад из месяца ведёт туда, где были до открытия дня
    await page.goBack();
    await expect(page).not.toHaveURL(/d=/);
  });

  test("набранное название не теряется при заходе в событие", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "12 октября").click();
    await sheet(page).getByPlaceholder("Новое событие").fill("Черновик");
    await rows(page).first().click();
    await expect(card(page)).toBeVisible();
    await sheet(page).getByRole("button", { name: "12 октября" }).click();
    await expect(sheet(page).getByPlaceholder("Новое событие")).toHaveValue("Черновик");
  });

  test("«Назад» в браузере: событие → день → месяц", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "14 октября").click();
    await rows(page).filter({ hasText: "Событие 5" }).click();
    await expect(card(page)).toContainText("За 15 минут");
    await expect(card(page)).toContainText("с 10:00");

    await page.goBack();
    await expect(card(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(4);
    await page.goBack();
    await expect(sheet(page)).toHaveCount(0);
  });

  test("ночное событие: продолжение открывает исходное событие", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "28 сентября").click();
    await rows(page).filter({ hasText: "Ночная смена" }).click();
    await expect(card(page)).toContainText("Воскресенье, 27 сентября 2026");
    await expect(card(page)).toContainText("23:00 – 01:00, следующего дня");
  });

  test("прямая ссылка на событие; «‹» без истории; несуществующее", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10&d=2026-10-14&e=fx-5");
    await expect(card(page).locator("h3")).toHaveText("Событие 5");
    await sheet(page).getByRole("button", { name: "14 октября" }).click();
    await expect(page).toHaveURL(/\?m=2026-10&d=2026-10-14$/);
    await expect(rows(page)).toHaveCount(4);

    await page.goto("/?m=2026-10&d=2026-10-14&e=nope-404");
    await expect(sheet(page)).toContainText("Событие не найдено");
    await page.goto("/?m=2026-10&d=2026-10-14&e=../../etc");
    await expect(sheet(page)).toContainText("Событие не найдено");
  });

  test("Esc в карточке события — назад к дню", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "12 октября").click();
    await rows(page).filter({ hasText: "Событие 3" }).click();
    await expect(card(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card(page)).toHaveCount(0);
    await expect(rows(page)).toHaveCount(3);
    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
  });

  test("новое событие сразу кликабельно и открывается", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "13 октября").click();
    await sheet(page).getByPlaceholder("Новое событие").fill("Свежее");
    await page.keyboard.press("Enter");
    await rows(page).filter({ hasText: "Свежее" }).click();
    await expect(card(page).locator("h3")).toHaveText("Свежее");
    await expect(page).toHaveURL(/e=ev-1$/);
  });
});

test.describe("ПК", () => {
  test.use(desktop);

  test("карточка события в окне, наведение на строку", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10&d=2026-10-14");
    const row = rows(page).first();
    await row.hover();
    await expect(row).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await row.click();
    await expect(card(page)).toBeVisible();
    const box = (await sheet(page).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(4);
  });
});
