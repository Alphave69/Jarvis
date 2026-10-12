import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Supabase-клиент для Server Components, Server Actions и Route Handlers.
 * Создавать заново на каждый запрос — никогда не хранить в модуле.
 * С cacheComponents вызывать только внутри <Suspense> или в Server Action.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component: cookies только для чтения.
          // Сессию обновляет src/proxy.ts, так что это безопасно.
        }
      },
    },
  });
}
