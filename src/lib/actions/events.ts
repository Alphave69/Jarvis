"use server";

import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { createEvent } from "@/lib/data/events";
import { parseEventInput } from "@/lib/event-input";
import { getUserTimeZone } from "@/lib/timezone";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Создать событие. Вход проверяется на сервере — клиенту не доверяем. */
export async function createEventAction(raw: unknown): Promise<ActionResult> {
  const parsed = parseEventInput(raw);
  if (!parsed.ok) return parsed;

  try {
    await createEvent(parsed.value, await getUserTimeZone());
  } catch (error) {
    unstable_rethrow(error); // редирект на /login при истёкшей сессии
    console.error(error);
    return { ok: false, error: "Не удалось сохранить. Проверьте интернет." };
  }

  // Перерисовать текущую страницу: точка в сетке и список дня обновятся.
  refresh();
  return { ok: true };
}
