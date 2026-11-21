import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("guest favourites live in a cookie and move into the account on registration", async ({ page, browser }) => {
  // a seller posts something to favourite
  const s = await browser.newContext();
  const sp = await s.newPage();
  await signIn(sp, "+996700200300", "/post");
  await sp.getByLabel("Категория").selectOption("home");
  await sp.getByLabel("Название").fill("Кресло-качалка из ротанга");
  await sp.getByLabel("Что").selectOption("Мебель");
  await sp.getByLabel("Сумма").fill("9500");
  await sp.getByRole("button", { name: "Опубликовать" }).click();
  await sp.waitForURL(/\/ad\//);
  const adUrl = new URL(sp.url()).pathname;
  await s.close();

  // a guest saves it without signing in
  await page.goto(adUrl);
  await page.getByRole("button", { name: "В избранное" }).first().click();
  await expect(page.getByRole("button", { name: "Убрать из избранного" }).first()).toBeVisible();
  await expect.poll(async () => (await page.context().cookies()).some((c) => c.name === "tabyl_fav")).toBe(true);
  await page.goto("/favorites");
  await expect(page.getByText("Сохранено в этом браузере")).toBeVisible();
  await expect(page.getByRole("link", { name: /Кресло-качалка/ })).toBeVisible();

  // registers with a name; the favourite follows
  await page.goto("/login?next=/favorites&mode=register");
  await expect(page.getByRole("tab", { name: "Регистрация" })).toHaveAttribute("aria-selected", "true");
  await page.getByLabel("Имя").fill("Бактыгуль");
  await page.getByLabel("Номер телефона").fill("555 777 888");
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByText("Нужно согласие с правилами")).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Получить код" }).click();
  const { code } = await (await page.request.get("/api/dev/last-code?phone=555777888")).json();
  await page.getByLabel("Код из СМС").fill(code);
  await page.getByRole("button", { name: "Создать аккаунт" }).click();
  await page.waitForURL(/\/favorites$/);
  await expect(page.getByText("Сохранено в этом браузере")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Кресло-качалка/ })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Бактыгуль" })).toBeVisible();
});

test("login page: back button and Google without keys", async ({ page }) => {
  await page.goto("/rules");
  await page.goto("/login");
  await page.getByRole("button", { name: "Назад" }).click();
  await expect(page).toHaveURL(/\/rules$/);
  await page.goto("/login");
  await page.getByRole("link", { name: "Войти через Google" }).click();
  await expect(page.getByText("Вход через Google пока не работает")).toBeVisible();
});

test("search suggests as you type and updates results in place", async ({ page }) => {
  await page.goto("/search?city=all");
  const box = page.getByRole("combobox", { name: "Поиск по объявлениям" });
  await box.fill("крес");
  await expect(page.getByRole("option", { name: /Кресло-качалка из ротанга/ })).toBeVisible();
  await expect(page).toHaveURL(/q=%D0%BA%D1%80%D0%B5%D1%81|q=крес/);
});
