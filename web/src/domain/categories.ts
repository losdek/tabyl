/**
 * Categories and their attributes. The same definitions drive the posting form,
 * the filters, validation and the ad page, so there is one source of truth.
 */

export type Attr =
  | { key: string; label: string; kind: "select"; options: readonly string[]; filter?: boolean; required?: boolean }
  | { key: string; label: string; kind: "number"; unit?: string; min?: number; max?: number; filter?: boolean; required?: boolean }
  | { key: string; label: string; kind: "text"; filter?: boolean; required?: boolean; placeholder?: string }
  | { key: string; label: string; kind: "bool"; filter?: boolean };

export type Category = {
  slug: string;
  name: string;
  /** whether «Новое / Б/у» makes sense */
  condition: boolean;
  /** label for the price field */
  priceLabel: string;
  /** default currency in the form */
  currency: "KGS" | "USD";
  attrs: readonly Attr[];
};

const CAR_BRANDS = [
  "Toyota", "Lexus", "Honda", "Hyundai", "Kia", "Mercedes-Benz", "BMW", "Audi", "Volkswagen", "Nissan",
  "Mitsubishi", "Subaru", "Mazda", "Chevrolet", "Daewoo", "Ford", "Lada", "Haval", "Chery", "BYD", "Zeekr", "Li Auto", "Другая",
] as const;

export const CATEGORIES: readonly Category[] = [
  {
    slug: "transport", name: "Транспорт", condition: false, priceLabel: "Цена", currency: "USD",
    attrs: [
      { key: "brand", label: "Марка", kind: "select", options: CAR_BRANDS, filter: true, required: true },
      { key: "model", label: "Модель", kind: "text", placeholder: "Camry", required: true },
      { key: "year", label: "Год выпуска", kind: "number", min: 1960, max: 2027, filter: true, required: true },
      { key: "mileage", label: "Пробег", kind: "number", unit: "км", min: 0, max: 2_000_000, filter: true },
      { key: "gearbox", label: "Коробка", kind: "select", options: ["Автомат", "Механика", "Вариатор", "Робот"], filter: true },
      { key: "fuel", label: "Топливо", kind: "select", options: ["Бензин", "Дизель", "Газ", "Гибрид", "Электро"], filter: true },
      { key: "engine", label: "Объём двигателя", kind: "number", unit: "л", min: 0, max: 10 },
      { key: "wheel", label: "Руль", kind: "select", options: ["Левый", "Правый"], filter: true },
      { key: "customs", label: "Растаможен", kind: "bool", filter: true },
    ],
  },
  {
    slug: "realty", name: "Недвижимость", condition: false, priceLabel: "Цена", currency: "USD",
    attrs: [
      { key: "deal", label: "Сделка", kind: "select", options: ["Продажа", "Аренда", "Посуточно"], filter: true, required: true },
      { key: "type", label: "Тип", kind: "select", options: ["Квартира", "Дом", "Комната", "Участок", "Коммерческая"], filter: true, required: true },
      { key: "rooms", label: "Комнат", kind: "number", min: 0, max: 20, filter: true },
      { key: "area", label: "Площадь", kind: "number", unit: "м²", min: 1, max: 100_000 },
      { key: "floor", label: "Этаж", kind: "number", min: -2, max: 60 },
      { key: "floors", label: "Этажей в доме", kind: "number", min: 1, max: 60 },
      { key: "series", label: "Серия", kind: "select", options: ["Элитка", "105 серия", "106 серия", "104 серия", "Хрущёвка", "Сталинка", "Другая"], filter: true },
    ],
  },
  {
    slug: "electronics", name: "Электроника", condition: true, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Телефоны", "Ноутбуки", "Планшеты", "ТВ и аудио", "Фото и видео", "Игровые приставки", "Комплектующие", "Другое"], filter: true, required: true },
      { key: "brand", label: "Бренд", kind: "text", placeholder: "Apple", filter: true },
    ],
  },
  {
    slug: "home", name: "Дом и сад", condition: true, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Мебель", "Бытовая техника", "Посуда", "Ремонт и стройка", "Растения", "Другое"], filter: true, required: true },
    ],
  },
  {
    slug: "clothes", name: "Одежда", condition: true, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Женская одежда", "Мужская одежда", "Обувь", "Аксессуары"], filter: true, required: true },
      { key: "size", label: "Размер", kind: "text", placeholder: "M или 41", filter: true },
    ],
  },
  {
    slug: "kids", name: "Детям", condition: true, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Одежда", "Коляски", "Игрушки", "Мебель", "Другое"], filter: true, required: true },
    ],
  },
  {
    slug: "jobs", name: "Работа", condition: false, priceLabel: "Зарплата в месяц", currency: "KGS",
    attrs: [
      { key: "type", label: "Тип", kind: "select", options: ["Вакансия", "Резюме"], filter: true, required: true },
      { key: "schedule", label: "График", kind: "select", options: ["Полный день", "Сменный", "Частичная занятость", "Удалённо"], filter: true },
    ],
  },
  {
    slug: "services", name: "Услуги", condition: false, priceLabel: "Цена от", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Ремонт", "Перевозки", "Красота", "Обучение", "Уборка", "IT", "Другое"], filter: true, required: true },
    ],
  },
  {
    slug: "animals", name: "Животные", condition: false, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Кто", kind: "select", options: ["Собаки", "Кошки", "Птицы", "Скот", "Другие"], filter: true, required: true },
    ],
  },
  {
    slug: "hobby", name: "Хобби", condition: true, priceLabel: "Цена", currency: "KGS",
    attrs: [
      { key: "type", label: "Что", kind: "select", options: ["Спорт", "Велосипеды", "Музыка", "Книги", "Коллекции", "Другое"], filter: true, required: true },
    ],
  },
];

export function categoryBySlug(slug: string | null | undefined): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Short human line of the most telling attributes, e.g. «2019 · 86 000 км · Автомат». */
export function attrSummary(cat: Category | undefined, attrs: Record<string, unknown>, max = 3): string {
  if (!cat) return "";
  const out: string[] = [];
  for (const a of cat.attrs) {
    const v = attrs[a.key];
    if (v === undefined || v === null || v === "") continue;
    if (a.kind === "bool") {
      if (v === true) out.push(a.label);
    } else if (a.kind === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      const s = n >= 10000 ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : String(n).replace(".", ",");
      out.push(a.unit ? `${s} ${a.unit}` : a.key === "rooms" ? `${s}-комн.` : s);
    } else {
      out.push(String(v));
    }
    if (out.length >= max) break;
  }
  return out.join(" · ");
}
