const H = [180, 130, 210, 150, 120, 190, 160, 140, 200, 125, 170, 150];

export function FeedSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-3 pt-24 md:px-8" aria-busy="true" aria-label="Загружаем объявления">
      <div className="columns-2 gap-2.5 md:columns-4 md:gap-4 lg:columns-5 xl:columns-6">
        {H.map((h, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div className="skeleton" style={{ height: h }} />
            <div className="skeleton mt-2 h-3.5 w-4/5" />
            <div className="skeleton mt-1.5 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdSkeleton() {
  return (
    <div className="mx-auto max-w-[1100px] md:px-8 md:pt-6" aria-busy="true" aria-label="Загружаем объявление">
      <div className="skeleton aspect-[4/3] !rounded-none md:max-w-[700px] md:!rounded-[12px]" />
      <div className="grid gap-3 px-4 pt-5 md:px-0">
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-6 w-3/4" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}
