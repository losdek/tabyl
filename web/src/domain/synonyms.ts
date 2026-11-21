/**
 * How people type brands here: «айфон», «тойота», «мерс». Each group lists the
 * spellings that should find each other, in both directions.
 */
const GROUPS: string[][] = [
  ["iphone", "айфон", "афон"], ["ipad", "айпад"], ["macbook", "макбук"], ["apple", "эпл", "эппл"],
  ["samsung", "самсунг"], ["xiaomi", "сяоми", "ксиоми"], ["redmi", "редми"], ["huawei", "хуавей"], ["honor", "хонор"],
  ["playstation", "плейстейшн", "плойка"], ["ps5", "пс5"], ["ps4", "пс4"], ["sony", "сони"], ["airpods", "аирподс", "эирподс"],
  ["toyota", "тойота"], ["camry", "камри"], ["corolla", "королла"], ["prius", "приус"], ["lexus", "лексус"],
  ["honda", "хонда"], ["fit", "фит"], ["hyundai", "хендай", "хундай", "хёндай", "хюндай"], ["kia", "киа"],
  ["mercedes", "мерседес", "мерс"], ["bmw", "бмв", "бэха"], ["audi", "ауди"], ["volkswagen", "фольксваген"],
  ["nissan", "ниссан"], ["mitsubishi", "мицубиси", "митсубиси"], ["subaru", "субару"], ["mazda", "мазда"],
  ["chevrolet", "шевроле"], ["daewoo", "дэу", "деу"], ["lada", "лада"], ["byd", "бид"], ["zeekr", "зикр"],
];

const INDEX = new Map<string, string[]>();
for (const g of GROUPS) for (const w of g) INDEX.set(w, g);

/** «айфон 15» → ["айфон 15", "iphone 15", "афон 15"]; the original stays first. */
export function queryVariants(q: string): string[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const out = new Set([q.trim()]);
  words.forEach((w, i) => {
    const group = INDEX.get(w);
    if (!group) return;
    for (const alt of group) {
      if (alt === w) continue;
      const copy = [...words];
      copy[i] = alt;
      out.add(copy.join(" "));
    }
  });
  return [...out].slice(0, 6);
}
