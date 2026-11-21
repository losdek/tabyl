export const CITIES = [
  { slug: "bishkek", name: "Бишкек", in: "в Бишкеке" },
  { slug: "osh", name: "Ош", in: "в Оше" },
  { slug: "jalal-abad", name: "Джалал-Абад", in: "в Джалал-Абаде" },
  { slug: "karakol", name: "Каракол", in: "в Караколе" },
  { slug: "tokmok", name: "Токмок", in: "в Токмоке" },
  { slug: "kara-balta", name: "Кара-Балта", in: "в Кара-Балте" },
  { slug: "naryn", name: "Нарын", in: "в Нарыне" },
  { slug: "talas", name: "Талас", in: "в Таласе" },
  { slug: "batken", name: "Баткен", in: "в Баткене" },
  { slug: "balykchy", name: "Балыкчы", in: "в Балыкчы" },
  { slug: "cholpon-ata", name: "Чолпон-Ата", in: "в Чолпон-Ате" },
  { slug: "kant", name: "Кант", in: "в Канте" },
  { slug: "uzgen", name: "Узген", in: "в Узгене" },
  { slug: "kyzyl-kiya", name: "Кызыл-Кия", in: "в Кызыл-Кие" },
] as const;

export type CitySlug = (typeof CITIES)[number]["slug"];
export const ALL_KG = { slug: "all", name: "Весь Кыргызстан", in: "по всему Кыргызстану" } as const;

export function cityBySlug(slug: string | null | undefined) {
  return CITIES.find((c) => c.slug === slug);
}
export function cityName(slug: string): string {
  return cityBySlug(slug)?.name ?? slug;
}
export function isCity(slug: string): slug is CitySlug {
  return CITIES.some((c) => c.slug === slug);
}
