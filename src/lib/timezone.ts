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

/**
 * Текущий момент на сервере. В e2e-тестах подменяется переменной E2E_NOW
 * (ISO-строка), чтобы «сегодня» и «сейчас» были одинаковыми у сервера и
 * браузера (там время фиксирует page.clock). В проде переменная не задана.
 */
export function serverNow(): Date {
  const fake = process.env.E2E_NOW;
  return fake ? new Date(fake) : new Date();
}
