/** Russian formatting helpers. Thin space for thousands is a no-break space. */

export const NBSP = " ";

export function formatNumber(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export type Currency = "KGS" | "USD";

/** null → «Договорная», 0 → «Даром», otherwise «24 500 $» / «92 000 сом». */
export function formatPrice(price: number | null, currency: Currency = "KGS"): string {
  if (price === null) return "Договорная";
  if (price === 0) return "Даром";
  return currency === "USD" ? `${formatNumber(price)}${NBSP}$` : `${formatNumber(price)}${NBSP}сом`;
}

/** Rough som equivalent for dollar prices, shown as a hint under the price. */
export const USD_TO_KGS = 87;
export function somHint(price: number | null, currency: Currency): string | null {
  if (price === null || price === 0 || currency !== "USD") return null;
  const som = Math.round((price * USD_TO_KGS) / 1000) * 1000;
  return `≈${NBSP}${formatNumber(som)}${NBSP}сом`;
}

/** «+996 700 123 456» from any input with 9 local digits. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("996") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  if (!/^\d{9}$/.test(local)) return null;
  return `+996${local}`;
}

export function formatPhone(e164: string): string {
  const m = /^\+996(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+996${NBSP}${m[1]}${NBSP}${m[2]}${NBSP}${m[3]}` : e164;
}

export function maskPhone(e164: string): string {
  const m = /^\+996(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+996${NBSP}${m[1]}${NBSP}×××${NBSP}×××` : "скрыт";
}

/** plural(5, ["объявление", "объявления", "объявлений"]) → «объявлений» */
export function plural(n: number, forms: [string, string, string]): string {
  const rule = new Intl.PluralRules("ru").select(n);
  return rule === "one" ? forms[0] : rule === "few" ? forms[1] : forms[2];
}

export function count(n: number, forms: [string, string, string]): string {
  return `${formatNumber(n)}${NBSP}${plural(n, forms)}`;
}

const TZ = "Asia/Bishkek";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const time = (d: Date) => d.toLocaleTimeString("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/** «12 мин назад», «сегодня в 14:20», «вчера в 09:30», «15 ноября», «15 ноября 2025». */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)}${NBSP}мин назад`;
  if (dayKey(date) === dayKey(now)) return `сегодня в${NBSP}${time(date)}`;
  const y = new Date(now.getTime() - 86_400_000);
  if (dayKey(date) === dayKey(y)) return `вчера в${NBSP}${time(date)}`;
  const sameYear = date.toLocaleDateString("ru-RU", { timeZone: TZ, year: "numeric" }) ===
    now.toLocaleDateString("ru-RU", { timeZone: TZ, year: "numeric" });
  return date
    .toLocaleDateString("ru-RU", { timeZone: TZ, day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) })
    .replace(" г.", "")
    .replace(/ /g, NBSP);
}

export function clockTime(date: Date): string {
  return time(date);
}

/** «был 5 минут назад» style presence line. */
export function lastSeen(date: Date, now: Date = new Date()): string {
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 180) return "в сети";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `был ${m}${NBSP}${plural(m, ["минуту", "минуты", "минут"])} назад`;
  }
  return `был ${relativeTime(date, now)}`;
}

const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/** «на Табыле с ноября 2026» */
export function memberSince(date: Date): string {
  const [y, m] = date.toLocaleDateString("en-CA", { timeZone: TZ }).split("-").map(Number);
  return `на Табыле с${NBSP}${MONTHS_GEN[m - 1]} ${y}`;
}
