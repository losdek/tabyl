import Link from "next/link";
import { CATEGORIES } from "@/domain/categories";
import { CategoryIcon } from "./CategoryIcon";

/** Category capsules with icons. `q` keeps the current search when switching category. */
export function CategoryPills({ active, q, wrap = false }: { active?: string; q?: string; wrap?: boolean }) {
  const suffix = q ? `?q=${encodeURIComponent(q)}` : "";
  return (
    <nav aria-label="Категории" className={`no-scrollbar flex gap-2 ${wrap ? "flex-wrap" : "-mx-3 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0"}`}>
      {CATEGORIES.map((c, i) => {
        const on = c.slug === active;
        return (
          <Link
            key={c.slug}
            href={on ? `/search${suffix}` : `/c/${c.slug}${suffix}`}
            aria-current={on ? "page" : undefined}
            className={`press card-in flex h-11 shrink-0 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-[15px] transition-colors ${on ? "bg-ink text-on-ink" : "bg-field hover:bg-line"}`}
            style={{ "--i": i } as React.CSSProperties}
          >
            <span className={`grid size-9 place-items-center rounded-full ${on ? "bg-sun text-on-sun" : "bg-sun/40 text-fg"}`}>
              <CategoryIcon slug={c.slug} size={19} />
            </span>
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
