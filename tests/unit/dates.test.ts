import { expect, test } from "@playwright/test";

import * as d from "@/lib/dates";

test.describe("сетка месяца", () => {
  test("42 дня, начинается с понедельника", () => {
    const oct = d.monthGridDates({ year: 2026, month: 10 });
    expect(oct).toHaveLength(42);
    expect(oct[0]).toBe("2026-09-28");
    expect(d.weekdayMondayFirst(oct[0])).toBe(0);
    expect(oct[3]).toBe("2026-10-01");
    expect(oct[41]).toBe("2026-11-08");
  });

  test("месяц, начинающийся в понедельник, начинается с 1-го", () => {
    expect(d.monthGridDates({ year: 2026, month: 6 })[0]).toBe("2026-06-01");
    expect(d.monthGridDates({ year: 2027, month: 2 })[0]).toBe("2027-02-01");
  });

  test("дни в месяце, високосный февраль", () => {
    expect(d.daysInMonth({ year: 2028, month: 2 })).toBe(29);
    expect(d.daysInMonth({ year: 2026, month: 2 })).toBe(28);
  });
});

test.describe("месяцы", () => {
  test("переход через год", () => {
    expect(d.addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(d.addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(d.addMonths({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 });
    expect(d.compareMonths({ year: 2026, month: 1 }, { year: 2025, month: 12 })).toBeGreaterThan(0);
  });

  test("параметр ?m=", () => {
    expect(d.parseMonthParam("2026-10")).toEqual({ year: 2026, month: 10 });
    expect(d.parseMonthParam("2026-13")).toBeNull();
    expect(d.parseMonthParam("abc")).toBeNull();
    expect(d.parseMonthParam(undefined)).toBeNull();
    expect(d.formatMonthParam({ year: 2026, month: 3 })).toBe("2026-03");
  });
});

test.describe("дни", () => {
  test("addDays через границы", () => {
    expect(d.addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(d.addDays("2028-03-01", -1)).toBe("2028-02-29");
    // переход на летнее время в Европе не сдвигает даты
    expect(d.addDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  test("строгая проверка даты", () => {
    expect(d.isValidDateString("2026-02-30")).toBe(false);
    expect(d.isValidDateString("2028-02-29")).toBe(true);
    expect(d.isValidDateString("2026-1-01")).toBe(false);
  });

  test("подписи", () => {
    expect(d.formatDayMonth("2026-10-12")).toBe("12 октября");
    expect(d.formatDayTitle("2026-10-14")).toBe("14 октября, среда");
    expect(d.formatFullDate("2026-10-12")).toBe("Понедельник, 12 октября 2026");
    expect(d.formatFullDate("2026-09-27")).toBe("Воскресенье, 27 сентября 2026");
  });
});

test.describe("часовые пояса", () => {
  test("«сегодня» зависит от пояса, не от машины", () => {
    const now = new Date("2026-10-12T22:30:00Z"); // в Москве уже 13-е
    expect(d.todayIn("Europe/Moscow", now)).toBe("2026-10-13");
    expect(d.todayIn("America/New_York", now)).toBe("2026-10-12");
  });

  test("проверка IANA-пояса", () => {
    expect(d.isValidTimeZone("Europe/Moscow")).toBe(true);
    expect(d.isValidTimeZone("Mars/Base")).toBe(false);
  });
});

test.describe("время", () => {
  test("через полночь", () => {
    expect(d.endsNextDay("22:00:00", "02:00:00")).toBe(true);
    expect(d.endsNextDay("22:00", "00:00")).toBe(false); // ровно в полночь — тот же день
    expect(d.endsNextDay("10:00", "11:00")).toBe(false);
    expect(d.endsNextDay("10:00", null)).toBe(false);
  });

  test("время и сдвиг по кругу суток", () => {
    expect(d.isValidTime("23:59")).toBe(true);
    expect(d.isValidTime("24:00")).toBe(false);
    expect(d.isValidTime("9:00")).toBe(false);
    expect(d.hhmm("10:30:00")).toBe("10:30");
    expect(d.addMinutesToTime("23:30", 60)).toBe("00:30");
    expect(d.addMinutesToTime("00:15", -30)).toBe("23:45");
    expect(d.timeToMinutes("14:05")).toBe(845);
  });

  test("текущее время в поясе", () => {
    const now = new Date("2026-10-12T11:05:00Z");
    expect(d.timeIn("Europe/Moscow", now)).toBe("14:05");
    expect(d.timeIn("UTC", new Date("2026-10-12T00:07:00Z"))).toBe("00:07");
  });
});
