import { expect, test } from "@playwright/test";

import { minutesBeforeLabel, reminderLabel } from "@/lib/reminders";

test("минуты, часы, дни — с правильными окончаниями", () => {
  expect(minutesBeforeLabel(5)).toBe("За 5 минут");
  expect(minutesBeforeLabel(1)).toBe("За 1 минуту");
  expect(minutesBeforeLabel(22)).toBe("За 22 минуты");
  expect(minutesBeforeLabel(15)).toBe("За 15 минут");
  expect(minutesBeforeLabel(60)).toBe("За 1 час");
  expect(minutesBeforeLabel(120)).toBe("За 2 часа");
  expect(minutesBeforeLabel(300)).toBe("За 5 часов");
  expect(minutesBeforeLabel(1440)).toBe("За 1 день");
  expect(minutesBeforeLabel(2880)).toBe("За 2 дня");
  expect(minutesBeforeLabel(90)).toBe("За 90 минут");
  expect(minutesBeforeLabel(0)).toBe("В момент начала");
});

test("событие со временем — от начала", () => {
  expect(reminderLabel(false, 30)).toBe("За 30 минут");
});

test("весь день — от 9:00 в день события (CLAUDE.md → Напоминания)", () => {
  expect(reminderLabel(true, 0)).toBe("В день события в 9:00");
  expect(reminderLabel(true, 780)).toBe("Накануне в 20:00");
  // старые значения из формы с минутами
  expect(reminderLabel(true, 15)).toBe("За 15 минут до 9:00");
  expect(reminderLabel(true, 1440)).toBe("За 1 день до 9:00");
});
