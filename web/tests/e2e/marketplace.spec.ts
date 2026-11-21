import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { newUser, photo, signIn } from "./helpers";

/**
 * The whole marketplace path, as two people and a moderator would use it:
 * sign in → post with photos → find it (typo, Cyrillic brand) → favourite →
 * chat live → review → promote (test checkout) → report → moderate → ban.
 */
test.describe.serial("marketplace", () => {
  let seller: { ctx: BrowserContext; page: Page };
  let buyer: { ctx: BrowserContext; page: Page };
  let adUrl = "";

  test.afterAll(async () => {
    await seller?.ctx.close();
    await buyer?.ctx.close();
  });

  test("sign-in rejects a wrong code, accepts the right one", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Номер телефона").fill("700 555 000");
    await page.getByRole("button", { name: "Получить код" }).click();
    await page.getByLabel("Код из СМС").fill("000000");
    await page.getByRole("button", { name: "Войти" }).click();
    await expect(page.locator("#login-error")).toHaveText("Неверный код");
    await signIn(page, "+996700555000", "/favorites");
    await expect(page).toHaveURL(/\/favorites$/);
  });

  test("seller posts an ad with three photos", async ({ browser }) => {
    seller = await newUser(browser, "+996700100200", "Нурлан");
    const p = seller.page;
    await p.goto("/post");
    await p.locator('input[type="file"]').setInputFiles([photo("camry"), photo("lexus"), photo("laptop")]);
    await expect(p.locator('img[src*="/media/p/"]')).toHaveCount(3, { timeout: 30_000 });
    await p.getByLabel("Категория").selectOption("transport");
    await p.getByLabel("Название").fill("Toyota Camry 70, 2019");
    await p.getByLabel("Марка").selectOption("Toyota");
    await p.getByLabel("Модель").fill("Camry");
    await p.getByLabel("Год выпуска").fill("2019");
    await p.getByLabel("Пробег, км (необязательно)").fill("86 000");
    await p.getByLabel("Сумма").fill("24 500");
    await p.getByLabel("Валюта").selectOption("USD");
    await p.getByLabel("Описание").fill("Один хозяин, все чеки есть.");
    await p.getByRole("button", { name: "Опубликовать" }).click();
    await p.waitForURL(/\/ad\/[a-z0-9]+\?posted=1/);
    adUrl = new URL(p.url()).pathname;
    await expect(p.getByRole("heading", { name: "Toyota Camry 70, 2019" })).toBeVisible();
    await expect(p.getByText("86 000 км")).toBeVisible();
    await expect(p.getByText("3 фото")).toBeVisible();
  });

  test("posting form shows every error at once", async () => {
    const p = seller.page;
    await p.goto("/post");
    await p.getByLabel("Категория").selectOption("transport");
    await p.getByLabel("Название").fill("ab");
    await p.getByLabel("Сумма").fill("100");
    await p.getByRole("button", { name: "Опубликовать" }).click();
    await expect(p.getByText("Минимум 3 символа")).toBeVisible();
    await expect(p.getByText("Заполните поле").first()).toBeVisible();
  });

  test("buyer finds it by typo and by Cyrillic brand, filters by price", async ({ browser }) => {
    buyer = await newUser(browser, "+996555300400", "Айгерим");
    const p = buyer.page;
    for (const q of ["тойота", "camr"]) {
      await p.goto(`/search?q=${encodeURIComponent(q)}`);
      await expect(p.getByRole("link", { name: /Toyota Camry 70, 2019/ }).first()).toBeVisible();
    }
    await p.goto("/c/transport?pmax=20000&cur=USD");
    await expect(p.getByText("Ничего не нашлось")).toBeVisible();
    await p.goto("/c/transport?pmax=30000&cur=USD&a_yearmin=2018");
    await expect(p.getByRole("link", { name: /Toyota Camry 70, 2019/ }).first()).toBeVisible();
  });

  test("buyer saves it to favourites", async () => {
    const p = buyer.page;
    await p.goto(adUrl);
    await p.getByRole("button", { name: "В избранное" }).first().click();
    await expect(p.getByRole("button", { name: "Убрать из избранного" }).first()).toBeVisible();
    await p.goto("/favorites");
    await expect(p.getByRole("link", { name: /Toyota Camry/ }).first()).toBeVisible();
  });

  test("chat is live in both directions, with read receipts", async () => {
    const b = buyer.page, s = seller.page;
    await b.goto(adUrl);
    await b.getByRole("button", { name: "Написать", exact: true }).click();
    await b.waitForURL(/\/chats\/.+/);
    const chatUrl = new URL(b.url()).pathname;
    await b.getByLabel("Сообщение").fill("Здравствуйте! Ещё продаёте?");
    await b.getByRole("button", { name: "Отправить", exact: true }).click();
    await expect(b.getByText("Здравствуйте! Ещё продаёте?")).toBeVisible();

    await s.goto("/chats");
    await expect(s.getByText("Здравствуйте! Ещё продаёте?")).toBeVisible();
    await s.goto(chatUrl);
    await expect(b.getByText("· прочитано")).toBeVisible();
    await s.getByLabel("Сообщение").fill("Да, приезжайте после шести");
    await s.getByRole("button", { name: "Отправить", exact: true }).click();
    await expect(b.getByText("Да, приезжайте после шести")).toBeVisible(); // arrives without reload

    await s.getByRole("button", { name: "Отправить адрес встречи" }).click();
    await s.getByPlaceholder(/Адрес встречи/).fill("ул. Ахунбаева, 98");
    await s.getByRole("button", { name: "Отправить адрес", exact: true }).click();
    await expect(b.getByRole("link", { name: "Открыть в 2ГИС" })).toBeVisible();
  });

  test("buyer reviews the seller after the conversation", async () => {
    const p = buyer.page;
    await p.goto("/u/" + (await sellerId(seller.page)));
    await p.getByRole("radio", { name: "5 из 5" }).check({ force: true });
    await p.getByPlaceholder(/Что понравилось/).fill("Всё как в описании");
    await p.getByRole("button", { name: "Оставить отзыв" }).click();
    await expect(p.getByText("Спасибо за отзыв")).toBeVisible();
    await p.reload();
    await expect(p.getByText("Всё как в описании")).toBeVisible();
    await expect(p.getByText(/★\s5 · 1\sотзыв/)).toBeVisible();
  });

  test("seller promotes the ad through the test checkout", async () => {
    const p = seller.page;
    await p.goto(adUrl);
    await p.getByRole("link", { name: "Продвинуть" }).click();
    await p.getByText("ТОП на 7 дней").click();
    await p.getByRole("button", { name: "Перейти к оплате" }).click();
    await p.waitForURL(/\/pay\/stub\//);
    await p.getByRole("button", { name: "Оплатить" }).click();
    await expect(p.getByRole("heading", { name: "Оплачено" })).toBeVisible();
    await buyer.page.goto("/search?q=toyota");
    await expect(buyer.page.getByText("Реклама")).toBeVisible();
  });

  test("a report reaches the moderator, who rejects the ad and bans the seller", async ({ browser }) => {
    const b = buyer.page;
    await b.goto(adUrl);
    await b.getByText("Пожаловаться").click();
    await b.getByLabel("Мошенничество").check();
    await b.getByRole("button", { name: "Отправить" }).click();
    await expect(b.getByText("Спасибо, модератор посмотрит")).toBeVisible();

    const admin = await browser.newContext();
    const a = await admin.newPage();
    await signIn(a, "+996700999999", "/admin");
    await expect(a.getByText("Мошенничество").first()).toBeVisible();
    await a.getByRole("button", { name: "Снять объявление" }).first().click();
    await expect(a.getByText("Жалобы 0")).toBeVisible();

    await b.goto(adUrl);
    await expect(b.getByRole("heading", { name: "Здесь ничего нет" })).toBeVisible();

    await a.goto("/admin?tab=users&q=700100200");
    await a.getByPlaceholder("Причина").fill("Мошенничество");
    await a.getByRole("button", { name: "Заблокировать" }).click();
    await expect(a.getByRole("button", { name: "Разблокировать" })).toBeVisible();
    await a.goto("/admin?tab=log");
    await expect(a.getByText(/user\.ban/)).toBeVisible();
    await admin.close();

    const again = await browser.newContext();
    const g = await again.newPage();
    await g.goto("/login");
    await g.getByLabel("Номер телефона").fill("700100200");
    await g.getByRole("button", { name: "Получить код" }).click();
    const { code } = await (await g.request.get("/api/dev/last-code?phone=700100200")).json();
    await g.getByLabel("Код из СМС").fill(code);
    await g.getByRole("button", { name: "Войти" }).click();
    await expect(g.locator("#login-error")).toHaveText("Аккаунт заблокирован модератором");
    await again.close();
  });
});

async function sellerId(p: Page) {
  await p.goto("/profile");
  const href = await p.getByRole("link", { name: "как вас видят покупатели" }).getAttribute("href");
  return href!.split("/").pop()!;
}
