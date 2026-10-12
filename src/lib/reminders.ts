// Подписи напоминаний. Договорённость (CLAUDE.md → «Напоминания»):
// у событий со временем минуты считаются от начала, у «весь день» — от 09:00.

export const ALL_DAY_REMINDER_ANCHOR = "09:00";
export const ALL_DAY_ON_THE_DAY = 0; // в день события в 9:00
export const ALL_DAY_EVENING_BEFORE = 780; // накануне в 20:00

/** «За 15 минут», «За 1 час», «За 2 дня»… */
export function minutesBeforeLabel(minutes: number): string {
  if (minutes === 0) return "В момент начала";
  if (minutes % 1440 === 0) return `За ${plural(minutes / 1440, "день", "дня", "дней")}`;
  if (minutes % 60 === 0) return `За ${plural(minutes / 60, "час", "часа", "часов")}`;
  return `За ${plural(minutes, "минуту", "минуты", "минут")}`;
}

export function reminderLabel(allDay: boolean, minutes: number): string {
  if (!allDay) return minutesBeforeLabel(minutes);
  if (minutes === ALL_DAY_ON_THE_DAY) return "В день события в 9:00";
  if (minutes === ALL_DAY_EVENING_BEFORE) return "Накануне в 20:00";
  // Старые значения до этапа 4: минуты до 9:00 в день события.
  return `${minutesBeforeLabel(minutes)} до 9:00`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? one
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
        ? few
        : many;
  return `${n} ${word}`;
}
