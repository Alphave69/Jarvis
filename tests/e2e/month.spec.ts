import {
  MONTHS,
  TZ,
  dayCell,
  desktop,
  dotsIn,
  expect,
  iPhone,
  monthTitle,
  swipe,
  test,
  todayInTz,
} from "./helpers";

const GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

test.describe("телефон", () => {
  test.use(iPhone);

  test("текущий месяц, сегодня подсвечено, cookie пояса", async ({ signedIn: page, context }) => {
    const [y, m, d] = todayInTz().split("-").map(Number);
    await expect(monthTitle(page)).toHaveText(`${MONTHS[m - 1]} ${y}`);
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(page.locator('[aria-current="date"]')).toHaveAttribute(
      "aria-label",
      new RegExp(`^${d} ${GENITIVE[m - 1]}`),
    );
    await expect(page.locator(".grid-rows-6 > button")).toHaveCount(42);
    const tz = (await context.cookies()).find((c) => c.name === "tz");
    expect(decodeURIComponent(tz?.value ?? "")).toBe(TZ);
  });

  test("точки событий (октябрь 2026)", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await expect(dotsIn(page, "12 октября")).toHaveCount(3);
    const colors = await dotsIn(page, "12 октября").evaluateAll((els) =>
      els.map((e) => getComputedStyle(e).backgroundColor),
    );
    expect(colors).toEqual(["rgb(255, 69, 58)", "rgb(10, 132, 255)", "rgb(48, 209, 88)"]);
    await expect(dotsIn(page, "14 октября"), "не больше 3 точек").toHaveCount(3);
    await expect(dotsIn(page, "13 октября")).toHaveCount(0);
    // 22:00–00:00 заканчивается в полночь — продолжения нет
    await expect(dotsIn(page, "20 октября")).toHaveCount(1);
    await expect(dotsIn(page, "21 октября")).toHaveCount(0);
    // через полночь на краях сетки
    await expect(dotsIn(page, "1 ноября"), "31 окт → 1 ноя").toHaveCount(1);
    await expect(dotsIn(page, "28 сентября"), "27 сен → 28 сен (день до сетки)").toHaveCount(1);
  });

  test("стрелки: месяц меняется сразу, точки догружаются, URL", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await page.getByRole("button", { name: "Следующий месяц" }).click();
    await expect(monthTitle(page)).toHaveText("Ноябрь 2026");
    await expect(page).toHaveURL(/\?m=2026-11$/);
    await expect(dotsIn(page, "20 ноября")).toHaveCount(1);
    await page.getByRole("button", { name: "Предыдущий месяц" }).click();
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");
  });

  test("свайпы: влево/вправо, короткий и вертикальный — нет", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    const box = (await page.locator(".touch-pan-y").boundingBox())!;
    const y = box.y + box.height / 2;
    const left = box.x + 40;
    const right = box.x + box.width - 40;

    await swipe(page, right, left, y);
    await expect(monthTitle(page)).toHaveText("Ноябрь 2026");
    await swipe(page, left, right, y);
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");

    await swipe(page, left + 60, left + 90, y); // 30px — мало
    await swipe(page, left + 100, left + 140, box.y + 40, 240); // в основном вертикально
    await page.waitForTimeout(300);
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");

    // два быстрых свайпа подряд → +2 месяца, URL догоняет
    await swipe(page, right, left, y);
    await swipe(page, right, left, y);
    await expect(monthTitle(page)).toHaveText("Декабрь 2026");
    await expect(page).toHaveURL(/\?m=2026-12$/);
  });

  test("«Сегодня», «Назад» в браузере, неверный ?m", async ({ signedIn: page }) => {
    const [y, m] = todayInTz().split("-").map(Number);
    await page.goto("/?m=2030-05");
    await expect(monthTitle(page)).toHaveText("Май 2030");
    await page.getByRole("button", { name: "Сегодня", exact: true }).click();
    await expect(monthTitle(page)).toHaveText(`${MONTHS[m - 1]} ${y}`);
    await expect(page.locator('[aria-current="date"]')).toHaveCount(1);

    await page.goBack();
    await expect(monthTitle(page)).toHaveText("Май 2030");

    await page.goto("/?m=2026-99");
    await expect(monthTitle(page)).toHaveText(`${MONTHS[m - 1]} ${y}`);
  });
});

test.describe("ПК", () => {
  test.use(desktop);

  test("клавиши ← →, перетаскивание мышью не листает", async ({ signedIn: page }) => {
    await page.goto("/?m=2026-10");
    await page.keyboard.press("ArrowRight");
    await expect(monthTitle(page)).toHaveText("Ноябрь 2026");
    await page.keyboard.press("ArrowLeft");
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");

    const box = (await page.locator(".touch-pan-y").boundingBox())!;
    await page.mouse.move(box.x + 600, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 100, box.y + 210, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    await expect(monthTitle(page)).toHaveText("Октябрь 2026");
  });

  test("день подсвечивается при наведении, курсор — рука", async ({ signedIn: page }) => {
    const cell = dayCell(page, "1 ");
    await cell.first().hover();
    await expect(cell.first()).toHaveCSS("cursor", "pointer");
    await expect(cell.first()).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });
});
