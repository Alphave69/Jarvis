// Хелперы дат без внешних библиотек.
// Дата — строка 'YYYY-MM-DD' (как отдаёт Postgres `date`), месяц — { year, month },
// month = 1..12. Арифметика через Date.UTC, чтобы пояс машины не сдвигал дни.

export type YearMonth = { year: number; month: number };

export const DEFAULT_TIME_ZONE = "Europe/Moscow";

export const MONTH_NAMES = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
] as const;

// Родительный падеж: «12 октября».
export const MONTH_NAMES_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
] as const;

export const WEEKDAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Сегодняшняя дата 'YYYY-MM-DD' в заданном поясе. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA форматирует как YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** Строгая проверка 'YYYY-MM-DD' (включая 30 февраля и т.п.). */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { year, month, day } = parseDate(value);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function addDays(date: string, days: number): string {
  const { year, month, day } = parseDate(date);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return toDateString(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/** День недели, понедельник = 0 … воскресенье = 6. */
export function weekdayMondayFirst(date: string): number {
  const { year, month, day } = parseDate(date);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function monthOf(date: string): YearMonth {
  const { year, month } = parseDate(date);
  return { year, month };
}

export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

/** Параметр URL месяца: 'YYYY-MM'. */
export function formatMonthParam({ year, month }: YearMonth): string {
  return `${year}-${pad(month)}`;
}

export function parseMonthParam(value: string | undefined | null): YearMonth | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12 || year < 1900 || year > 2999) return null;
  return { year, month };
}

export function daysInMonth({ year, month }: YearMonth): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const GRID_DAYS = 42; // 6 недель — сетка не «прыгает» по высоте между месяцами

/** 42 даты сетки месяца, начиная с понедельника недели, где 1-е число. */
export function monthGridDates(ym: YearMonth): string[] {
  const first = toDateString(ym.year, ym.month, 1);
  const start = addDays(first, -weekdayMondayFirst(first));
  return Array.from({ length: GRID_DAYS }, (_, i) => addDays(start, i));
}

/** Первая и последняя дата сетки (для выборки событий). */
export function monthGridRange(ym: YearMonth): { from: string; to: string } {
  const dates = monthGridDates(ym);
  return { from: dates[0], to: dates[dates.length - 1] };
}

/** «12 октября». */
export function formatDayMonth(date: string): string {
  const { month, day } = parseDate(date);
  return `${day} ${MONTH_NAMES_GENITIVE[month - 1]}`;
}

/**
 * Событие «через полночь»: конец раньше начала → заканчивается на следующий день.
 * Конец ровно в 00:00 — это конец того же дня, продолжения нет.
 */
export function endsNextDay(startTime: string | null, endTime: string | null): boolean {
  if (!startTime || !endTime) return false;
  return endTime < startTime && endTime.slice(0, 5) !== "00:00";
}
