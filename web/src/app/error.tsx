"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto grid min-h-[60dvh] max-w-sm content-center justify-items-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-medium">Что-то сломалось</h1>
      <p className="text-mut">Мы уже знаем. Попробуйте ещё раз через минуту.</p>
      <button onClick={reset} className="mt-2 h-11 rounded-[12px] bg-ink px-5 font-medium text-on-ink">Обновить</button>
    </main>
  );
}
