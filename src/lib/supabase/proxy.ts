import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Всё, что проходит через proxy, зависит от входа — кешировать нельзя.
 * Иначе Chrome при «Назад» берёт из кеша старый 307 «/ → /login»
 * (сохранённый до входа), сервер уже со входом отвечает «/login → /» —
 * и получается бесконечный редирект.
 */
const NO_STORE = "private, no-store";

/**
 * Обновляет сессию Supabase (refresh токена → новые cookies) и делает
 * быстрый редирект: без входа → /login, со входом на /login → /.
 * Это оптимистичная проверка; настоящая — в lib/data (requireUser) и RLS.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // Свежие токены нужны и самому запросу (рендер), и ответу (браузер).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          // Cache-Control: no-store — ответ с токенами нельзя кешировать.
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // Ничего не вставлять между createServerClient и getClaims():
  // иначе возможны «случайные» разлогины.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);
  const isPublic = PUBLIC_PATHS.has(request.nextUrl.pathname);

  if (!isSignedIn && !isPublic) return redirectWithSession(request, response, "/login");
  if (isSignedIn && isPublic) return redirectWithSession(request, response, "/");

  // Вернуть именно этот объект: на нём Set-Cookie с обновлёнными токенами.
  response.headers.set("Cache-Control", NO_STORE);
  return response;
}

function redirectWithSession(
  request: NextRequest,
  from: NextResponse,
  pathname: string,
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ["Expires", "Pragma"]) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  redirect.headers.set("Cache-Control", NO_STORE);
  return redirect;
}
