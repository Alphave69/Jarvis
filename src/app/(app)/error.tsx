"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg">Не удалось загрузить календарь.</p>
      <p className="text-muted">Проверьте интернет и попробуйте ещё раз.</p>
      <button
        type="button"
        onClick={reset}
        className="h-12 rounded-xl bg-surface px-6 text-base text-accent active:opacity-70"
      >
        Повторить
      </button>
    </main>
  );
}
