import { expect, signIn, test } from "./helpers";

test("без входа любая страница ведёт на /login", async ({ page }) => {
  for (const path of ["/", "/?m=2026-10", "/?m=2026-10&d=2026-10-12", "/event/abc"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  await expect(page.getByRole("button", { name: "Войти" })).toBeVisible();
});

test("файлы PWA и статика не редиректятся на /login", async ({ request }) => {
  const favicon = await request.get("/favicon.ico", { maxRedirects: 0 });
  expect(favicon.status()).toBe(200);
  // sw.js и manifest появятся на шаге 8 — сейчас 404, но не 307 на /login
  for (const path of ["/sw.js", "/manifest.webmanifest", "/icons/icon-192.png"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).not.toBe(307);
  }
});

test("неверный пароль — понятная ошибка, почта остаётся", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Почта").fill("me@example.com");
  await page.getByPlaceholder("Пароль").fill("wrong");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.locator("p[role=alert]")).toHaveText("Неверная почта или пароль.");
  await expect(page.getByPlaceholder("Почта")).toHaveValue("me@example.com");
  await expect(page.getByPlaceholder("Пароль")).toHaveValue("");
});

test("вход → календарь; /login со входом → /; выход", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Выйти" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
