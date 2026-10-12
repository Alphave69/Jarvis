import "server-only";

import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/**
 * Единая серверная проверка входа. Вызывается из каждой функции lib/data
 * и каждого Server Action — proxy.ts лишь оптимистичная проверка.
 * getClaims() проверяет подпись JWT (getSession() на сервере — нельзя).
 */
export const requireUser = cache(async () => {
  // Supabase проверяет срок токена через Date.now(). С cacheComponents это
  // запрещено при пререндере (даже после cookies() — в runtime-prefetch),
  // поэтому явно выносим проверку из пререндера.
  await io();
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) redirect("/login");

  return {
    supabase,
    userId: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});
