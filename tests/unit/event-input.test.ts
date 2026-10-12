import { expect, test } from "@playwright/test";

import { parseEventInput, TITLE_MAX_LENGTH } from "@/lib/event-input";

const base = { title: "Встреча", eventDate: "2026-10-14" };

test("минимум — название и дата: весь день, синий, без напоминания", () => {
  const r = parseEventInput(base);
  expect(r).toEqual({
    ok: true,
    value: {
      title: "Встреча",
      eventDate: "2026-10-14",
      allDay: true,
      startTime: null,
      endTime: null,
      color: "blue",
      reminderEnabled: false,
      reminderMinutesBefore: null,
    },
  });
});

test("название обрезается и обязательно", () => {
  expect(parseEventInput({ ...base, title: "  Тест  " })).toMatchObject({ ok: true, value: { title: "Тест" } });
  expect(parseEventInput({ ...base, title: " \n\t " })).toEqual({ ok: false, error: "Введите название." });
  expect(parseEventInput({ ...base, title: "x".repeat(TITLE_MAX_LENGTH + 1) }).ok).toBe(false);
});

test("дата проверяется строго", () => {
  expect(parseEventInput({ ...base, eventDate: "2026-02-30" }).ok).toBe(false);
  expect(parseEventInput({ ...base, eventDate: "14.10.2026" }).ok).toBe(false);
});

test("«весь день» обнуляет время", () => {
  const r = parseEventInput({ ...base, allDay: true, startTime: "10:00", endTime: "11:00" });
  expect(r).toMatchObject({ ok: true, value: { startTime: null, endTime: null } });
});

test("со временем: начало обязательно, конец необязателен", () => {
  expect(parseEventInput({ ...base, allDay: false })).toEqual({ ok: false, error: "Укажите время начала." });
  expect(parseEventInput({ ...base, allDay: false, startTime: "10:00" })).toMatchObject({
    ok: true,
    value: { allDay: false, startTime: "10:00", endTime: null },
  });
  expect(parseEventInput({ ...base, allDay: false, startTime: "10:00", endTime: "" })).toMatchObject({
    ok: true,
    value: { endTime: null },
  });
});

test("через полночь разрешено, равные начало и конец — нет", () => {
  expect(parseEventInput({ ...base, allDay: false, startTime: "23:00", endTime: "01:00" }).ok).toBe(true);
  expect(parseEventInput({ ...base, allDay: false, startTime: "10:00", endTime: "10:00" })).toEqual({
    ok: false,
    error: "Конец совпадает с началом.",
  });
  expect(parseEventInput({ ...base, allDay: false, startTime: "25:00" }).ok).toBe(false);
});

test("неизвестный цвет → синий", () => {
  expect(parseEventInput({ ...base, color: "pink" })).toMatchObject({ ok: true, value: { color: "blue" } });
  expect(parseEventInput({ ...base, color: "purple" })).toMatchObject({ ok: true, value: { color: "purple" } });
});

test("напоминание: минуты обязательны и в разумных пределах", () => {
  expect(parseEventInput({ ...base, reminderEnabled: true, reminderMinutesBefore: 15 })).toMatchObject({
    ok: true,
    value: { reminderEnabled: true, reminderMinutesBefore: 15 },
  });
  expect(parseEventInput({ ...base, reminderEnabled: true }).ok).toBe(false);
  expect(parseEventInput({ ...base, reminderEnabled: true, reminderMinutesBefore: -5 }).ok).toBe(false);
  expect(parseEventInput({ ...base, reminderEnabled: true, reminderMinutesBefore: 1.5 }).ok).toBe(false);
  // выключенное напоминание игнорирует минуты
  expect(parseEventInput({ ...base, reminderEnabled: false, reminderMinutesBefore: 30 })).toMatchObject({
    ok: true,
    value: { reminderMinutesBefore: null },
  });
});

test("мусор на входе", () => {
  expect(parseEventInput(null).ok).toBe(false);
  expect(parseEventInput("строка").ok).toBe(false);
});
