import "server-only";

import { cookies } from "next/headers";

import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/dates";

/** Имя cookie, куда клиент кладёт свой IANA-пояс (см. TimeZoneSync). */
export const TZ_COOKIE = "tz";

/**
 * Пояс пользователя. Сервер (например, Vercel) живёт в UTC, поэтому
 * «сегодня» считаем в поясе браузера, присланном через cookie.
 */
export async function getUserTimeZone(): Promise<string> {
  const raw = (await cookies()).get(TZ_COOKIE)?.value;
  const value = raw ? safeDecode(raw) : null;
  return value && isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
