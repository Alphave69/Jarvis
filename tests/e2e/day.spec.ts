import {
  dayCell,
  desktop,
  dotsIn,
  expect,
  iPhone,
  mockLog,
  monthTitle,
  sheet,
  swipe,
  test,
  titleInput,
  todayInTz,
} from "./helpers";

const list = (page: Parameters<typeof sheet>[0]) => sheet(page).locator("ul");

test.describe("телефон", () => {
  test.use(iPhone);

  test("два тапа: пустой день → название → Enter", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "13 октября").click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator("h2")).toHaveText(/^13 октября, вторник/);
    await expect(page).toHaveURL(/\?m=2026-10&d=2026-10-13$/);
    await expect(sheet(page).getByText("Пока пусто")).toBeVisible();
    await expect(titleInput(page)).toBeFocused();

    const add = sheet(page).getByRole("button", { name: "Добавить" });
    await expect(add).toBeDisabled();
    await page.keyboard.type("   ");
    await expect(add, "одни пробелы — нельзя").toBeDisabled();

    await titleInput(page).fill("Купить хлеб");
    await page.keyboard.press("Enter");
    await expect(list(page)).toContainText("Купить хлеб");
    await expect(list(page)).toContainText("Весь день");
    await expect(sheet(page).getByText("Пока пусто")).toHaveCount(0);
    await expect(titleInput(page)).toHaveValue("");
    await expect(titleInput(page), "можно сразу добавить ещё").toBeFocused();

    await sheet(page).getByRole("button", { name: "Закрыть" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/d=/);
    await expect(dotsIn(page, "13 октября")).toHaveCount(1);

    const inserts = (await mockLog()).filter((l) => l.op === "insert");
    expect(inserts).toHaveLength(1);
    expect(inserts[0].row).toMatchObject({
      title: "Купить хлеб",
      event_date: "2026-10-13",
      all_day: true,
      color: "blue",
      timezone: "Europe/Moscow",
    });
  });

  test("порядок: весь день → по времени; «Назад» закрывает", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "12 октября").click();
    await expect(list(page)).toContainText("Событие 3");
    const text = await list(page).innerText();
    const pos = ["Весь день", "Событие 1", "10:00–11:00", "Событие 2", "15:00", "Событие 3"].map((s) =>
      text.indexOf(s),
    );
    expect(pos.every((p, i) => p >= 0 && (i === 0 || p > pos[i - 1])), text).toBe(true);

    await page.goBack();
    await expect(sheet(page)).toHaveCount(0);
    await expect(page).not.toHaveURL(/d=/);
  });

  test("продолжение ночного события со вчера", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "28 сентября").click();
    await expect(list(page)).toContainText("до 01:00");
    await expect(list(page)).toContainText("Ночная смена");
    await expect(page, "месяц под карточкой не меняется").toHaveURL(/\?m=2026-10&d=2026-09-28$/);
  });

  test("«Ещё»: время через полночь, цвет, напоминание", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "16 октября").click();
    await titleInput(page).fill("Ночной поезд");
    await sheet(page).getByRole("button", { name: /Ещё/ }).click();
    await sheet(page).getByText("Весь день").click();

    const times = sheet(page).locator('input[type="time"]');
    await times.nth(0).fill("23:00");
    await expect(times.nth(1), "конец = начало + 1 ч").toHaveValue("00:00");
    await times.nth(1).fill("01:00");
    await expect(sheet(page).getByText("Закончится на следующий день")).toBeVisible();
    await sheet(page).getByLabel("Фиолетовый").check({ force: true });
    await sheet(page).getByText("Напомнить").click();
    await sheet(page).locator("select").selectOption("30");
    await sheet(page).getByRole("button", { name: "Добавить" }).click();

    await expect(list(page)).toContainText("23:00–01:00⁺¹");
    await expect(sheet(page).locator('input[type="time"]'), "«Ещё» свернулось").toHaveCount(0);

    const [insert] = (await mockLog()).filter((l) => l.op === "insert");
    expect(insert.row).toMatchObject({
      all_day: false,
      start_time: "23:00:00",
      end_time: "01:00:00",
      color: "purple",
      reminder_enabled: true,
      reminder_minutes_before: 30,
    });

    // ошибка формы: начало = конец — текст остаётся
    await titleInput(page).fill("Ошибка");
    await sheet(page).getByRole("button", { name: /Ещё/ }).click();
    await sheet(page).getByText("Весь день").click();
    await sheet(page).locator('input[type="time"]').nth(0).fill("10:00");
    await sheet(page).locator('input[type="time"]').nth(1).fill("10:00");
    await sheet(page).getByRole("button", { name: "Добавить" }).click();
    await expect(sheet(page).locator('[role="alert"]')).toContainText("совпадает");
    await expect(titleInput(page)).toHaveValue("Ошибка");

    // свайп шторки вниз закрывает; точки на 16 и 17
    const head = (await sheet(page).locator("h2").boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const x = head.x + 20;
    const y0 = head.y - 10;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
    for (let i = 1; i <= 10; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 + i * 20 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(sheet(page)).toHaveCount(0);
    await expect(dotsIn(page, "16 октября")).toHaveCount(1);
    await expect(dotsIn(page, "17 октября")).toHaveCount(1);
  });

  test("свайп по сетке не открывает день", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    const box = (await page.locator(".touch-pan-y").boundingBox())!;
    await swipe(page, box.x + box.width - 40, box.x + 40, box.y + box.height / 2);
    await expect(monthTitle(page)).toHaveText("Ноябрь 2026");
    await page.waitForTimeout(300);
    await expect(sheet(page)).toHaveCount(0);
  });

  test("«+» из другого месяца открывает сегодня", async ({ signedIn: page }) => {
    const today = todayInTz();
    await page.goto("/?m=2030-05");
    await page.getByRole("button", { name: "Новое событие на сегодня" }).click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).locator("h2")).toContainText("сегодня");
    await expect(page).toHaveURL(new RegExp(`\\?m=${today.slice(0, 7)}&d=${today}$`));

    await page.mouse.click(30, 60); // тап по фону
    await expect(sheet(page)).toHaveCount(0);
  });

  test("прямая ссылка ?d=, закрытие, неверная дата", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10&d=2026-10-14");
    await expect(sheet(page).locator("li")).toHaveCount(4);
    await sheet(page).getByRole("button", { name: "Закрыть" }).click();
    await expect(page).toHaveURL(/\/\?m=2026-10$/);

    await page.goto("/?m=2026-10&d=2026-02-30");
    await page.waitForTimeout(300);
    await expect(sheet(page)).toHaveCount(0);
  });
});

test.describe("ПК", () => {
  test.use(desktop);

  test("окно по центру; Esc; стрелки не листают при открытой карточке", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await dayCell(page, "22 октября").click();
    await expect(sheet(page)).toBeVisible();
    await expect(sheet(page).getByText("Пока пусто")).toBeVisible();
    const box = (await sheet(page).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - 720)).toBeLessThan(4);
    expect(box.width).toBeLessThanOrEqual(449);

    await sheet(page).getByRole("button", { name: "Закрыть" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");

    await page.keyboard.press("Escape");
    await expect(sheet(page)).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await expect(monthTitle(page)).toHaveText("Ноябрь 2026");
  });
});
