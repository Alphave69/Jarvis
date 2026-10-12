import { Suspense } from "react";

import { signOut } from "@/lib/actions/auth";
import { requireUser } from "@/lib/data/auth";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <header className="flex h-14 items-center justify-between">
        <h1 className="text-xl font-semibold">Джарвис</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="h-11 px-2 text-base text-accent active:opacity-60"
          >
            Выйти
          </button>
        </form>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <Suspense fallback={<p className="text-muted">Загрузка…</p>}>
          <Account />
        </Suspense>
        <p className="text-muted">Календарь — на следующем шаге.</p>
      </div>
    </main>
  );
}

async function Account() {
  const { email } = await requireUser();
  return <p>Вы вошли как {email ?? "пользователь"}</p>;
}
