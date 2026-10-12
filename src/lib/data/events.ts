import "server-only";

import type { EventColor } from "@/lib/database.types";
import { addDays, endsNextDay } from "@/lib/dates";
import { requireUser } from "./auth";

/** Сколько точек максимум рисуем в клетке месяца. */
const MAX_MARKERS_PER_DAY = 3;

/** Дата 'YYYY-MM-DD' → цвета событий этого дня (для точек в сетке месяца). */
export type DayMarkers = Record<string, EventColor[]>;

/**
 * Точки для сетки месяца на диапазоне [from, to].
 * Берём на день раньше: событие «через полночь» с последнего дня прошлого
 * диапазона продолжается в первый день текущего.
 */
export async function getDayMarkers(from: string, to: string): Promise<DayMarkers> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("events")
    .select("event_date, start_time, end_time, color")
    .gte("event_date", addDays(from, -1))
    .lte("event_date", to)
    .order("event_date")
    .order("all_day", { ascending: false })
    .order("start_time", { nullsFirst: true });

  if (error) throw new Error(`Не удалось загрузить события: ${error.message}`);

  const markers: DayMarkers = {};
  const add = (date: string, color: EventColor) => {
    if (date < from || date > to) return;
    const list = (markers[date] ??= []);
    if (list.length < MAX_MARKERS_PER_DAY) list.push(color);
  };

  for (const event of data) {
    add(event.event_date, event.color);
    if (endsNextDay(event.start_time, event.end_time)) {
      add(addDays(event.event_date, 1), event.color);
    }
  }
  return markers;
}
