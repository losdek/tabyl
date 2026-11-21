import { expect, type Browser, type Page } from "@playwright/test";
import path from "node:path";

export const PHOTOS = path.join(__dirname, "..", "..", "..", "design", "directions", "img");
export const photo = (k: string) => path.join(PHOTOS, `${k}.webp`);

/** Sign in through the real UI; the code comes from the e2e-only endpoint. */
export async function signIn(page: Page, phone: string, next = "/") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Номер телефона").fill(phone);
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByText(/Отправили код/)).toBeVisible();
  const r = await page.request.get(`/api/dev/last-code?phone=${encodeURIComponent(phone)}`);
  const { code } = await r.json();
  await page.getByLabel("Код из СМС").fill(code);
  await page.getByRole("button", { name: "Войти" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"));
}

export async function newUser(browser: Browser, phone: string, name: string) {
  const ctx = await browser.newContext({ locale: "ru-RU", timezoneId: "Asia/Bishkek", viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await signIn(page, phone, "/profile");
  await page.getByLabel("Имя для объявлений").fill(name);
  await page.getByRole("button", { name: "Сохранить" }).click();
  await expect(page.getByText("Сохранено")).toBeVisible();
  return { ctx, page };
}
