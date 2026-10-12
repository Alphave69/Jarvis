// Проверка входных данных события. Чистые функции без БД: используются
// Server Action'ами сейчас и инструментами Джарвиса на этапе 3.

import type { EventColor } from "@/lib/database.types";
import { isValidDateString, isValidTime } from "@/lib/dates";

export const EVENT_COLOR_VALUES: readonly EventColor[] = [
  "red", "orange", "yellow", "green", "blue", "purple", "gray",
];

export const TITLE_MAX_LENGTH = 200;
/** Напоминание не раньше чем за 4 недели. */
export const REMINDER_MAX_MINUTES = 4 * 7 * 24 * 60;

/** Варианты «за сколько напомнить» в форме. */
export const REMINDER_OPTIONS = [
  { minutes: 5, label: "За 5 минут" },
  { minutes: 15, label: "За 15 минут" },
  { minutes: 30, label: "За 30 минут" },
  { minutes: 60, label: "За 1 час" },
  { minutes: 1440, label: "За 1 день" },
] as const;
export const DEFAULT_REMINDER_MINUTES = 15;

export type EventInput = {
  title: string;
  eventDate: string; // 'YYYY-MM-DD'
  allDay: boolean;
  startTime: string | null; // 'HH:MM'
  endTime: string | null; // 'HH:MM'; меньше начала = конец на следующий день
  color: EventColor;
  reminderEnabled: boolean;
  reminderMinutesBefore: number | null;
};

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): ParseResult<never> => ({ ok: false, error });

/** Принимает «сырые» данные от клиента и возвращает проверенный EventInput. */
export function parseEventInput(raw: unknown): ParseResult<EventInput> {
  if (typeof raw !== "object" || raw === null) return fail("Некорректные данные.");
  const r = raw as Record<string, unknown>;

  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title) return fail("Введите название.");
  if (title.length > TITLE_MAX_LENGTH) {
    return fail(`Название длиннее ${TITLE_MAX_LENGTH} символов.`);
  }

  const eventDate = typeof r.eventDate === "string" ? r.eventDate : "";
  if (!isValidDateString(eventDate)) return fail("Некорректная дата.");

  const allDay = r.allDay !== false;
  let startTime: string | null = null;
  let endTime: string | null = null;
  if (!allDay) {
    startTime = typeof r.startTime === "string" ? r.startTime : "";
    if (!isValidTime(startTime)) return fail("Укажите время начала.");
    const end = typeof r.endTime === "string" ? r.endTime : "";
    if (end) {
      if (!isValidTime(end)) return fail("Некорректное время конца.");
      if (end === startTime) return fail("Конец совпадает с началом.");
      endTime = end;
    }
  }

  const color = (EVENT_COLOR_VALUES as readonly unknown[]).includes(r.color)
    ? (r.color as EventColor)
    : "blue";

  const reminderEnabled = r.reminderEnabled === true;
  let reminderMinutesBefore: number | null = null;
  if (reminderEnabled) {
    const minutes = r.reminderMinutesBefore;
    if (
      typeof minutes !== "number" ||
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > REMINDER_MAX_MINUTES
    ) {
      return fail("Выберите, за сколько напомнить.");
    }
    reminderMinutesBefore = minutes;
  }

  return {
    ok: true,
    value: {
      title,
      eventDate,
      allDay,
      startTime,
      endTime,
      color,
      reminderEnabled,
      reminderMinutesBefore,
    },
  };
}
