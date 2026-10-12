import "server-only";

import type { EventColor, Tables } from "@/lib/database.types";
import { addDays, endsNextDay, hhmm } from "@/lib/dates";
import type { EventInput } from "@/lib/event-input";
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

/** Событие в карточке дня. Время — 'HH:MM'. */
export type DayEvent = Pick<Tables<"events">, "id" | "title" | "all_day" | "color"> & {
  start_time: string | null;
  end_time: string | null;
  /** Началось вчера и продолжается после полуночи. */
  continued: boolean;
};

/**
 * События дня: начинающиеся в этот день + «через полночь» со вчера.
 * Порядок: весь день → продолжения со вчера → по времени начала.
 */
export async function listDayEvents(date: string): Promise<DayEvent[]> {
  const { supabase } = await requireUser();
  const previous = addDays(date, -1);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, event_date, all_day, start_time, end_time, color")
    .gte("event_date", previous)
    .lte("event_date", date)
    .order("start_time", { nullsFirst: true });

  if (error) throw new Error(`Не удалось загрузить события: ${error.message}`);

  const rank = (e: DayEvent) => (e.all_day ? 0 : e.continued ? 1 : 2);

  return data
    .filter(
      (e) => e.event_date === date || endsNextDay(e.start_time, e.end_time),
    )
    .map((e) => ({
      id: e.id,
      title: e.title,
      all_day: e.all_day,
      color: e.color,
      start_time: e.start_time ? hhmm(e.start_time) : null,
      end_time: e.end_time ? hhmm(e.end_time) : null,
      continued: e.event_date !== date,
    }))
    .sort(
      (a, b) =>
        rank(a) - rank(b) || (a.start_time ?? "").localeCompare(b.start_time ?? ""),
    );
}

/** Создаёт событие текущего пользователя. user_id подставляет БД (auth.uid()). */
export async function createEvent(
  input: EventInput,
  timezone: string,
): Promise<{ id: string }> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("events")
    .insert({
      title: input.title,
      event_date: input.eventDate,
      all_day: input.allDay,
      start_time: input.startTime,
      end_time: input.endTime,
      timezone,
      color: input.color,
      reminder_enabled: input.reminderEnabled,
      reminder_minutes_before: input.reminderMinutesBefore,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Не удалось создать событие: ${error.message}`);
  return data;
}

/** Полные данные события для его карточки. Время — 'HH:MM'. */
export type EventDetails = Pick<
  Tables<"events">,
  | "id"
  | "title"
  | "event_date"
  | "all_day"
  | "color"
  | "reminder_enabled"
  | "reminder_minutes_before"
> & {
  start_time: string | null;
  end_time: string | null;
};

/** Похоже ли на id события (uuid в Supabase). Мусор в URL — сразу «не найдено». */
export function isEventIdLike(value: string): boolean {
  return /^[0-9A-Za-z-]{1,64}$/.test(value);
}

/** Одно событие текущего пользователя или null (нет такого / чужое — RLS). */
export async function getEvent(id: string): Promise<EventDetails | null> {
  if (!isEventIdLike(id)) return null;
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("events")
    .select(
      "id, title, event_date, all_day, start_time, end_time, color, reminder_enabled, reminder_minutes_before",
    )
    .eq("id", id)
    .maybeSingle();

  // 22P02 — строка не uuid: для пользователя это тоже «не найдено».
  if (error?.code === "22P02") return null;
  if (error) throw new Error(`Не удалось загрузить событие: ${error.message}`);
  if (!data) return null;

  return {
    ...data,
    start_time: data.start_time ? hhmm(data.start_time) : null,
    end_time: data.end_time ? hhmm(data.end_time) : null,
  };
}
