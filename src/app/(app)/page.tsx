import { MonthView } from "@/components/MonthView";
import { getDayMarkers, listDayEvents } from "@/lib/data/events";
import {
  isValidDateString,
  monthGridRange,
  monthOf,
  parseMonthParam,
  todayIn,
} from "@/lib/dates";
import { getUserTimeZone } from "@/lib/timezone";

export default async function MonthPage({ searchParams }: PageProps<"/">) {
  const { m, d } = await searchParams;
  const today = todayIn(await getUserTimeZone());
  const month = parseMonthParam(typeof m === "string" ? m : null) ?? monthOf(today);

  // ?d=YYYY-MM-DD — открытая поверх месяца карточка дня.
  const dayDate = typeof d === "string" && isValidDateString(d) ? d : null;

  const { from, to } = monthGridRange(month);
  const [markers, dayEvents] = await Promise.all([
    getDayMarkers(from, to),
    dayDate ? listDayEvents(dayDate) : null,
  ]);

  return (
    <MonthView
      month={month}
      today={today}
      markers={markers}
      day={dayDate && dayEvents ? { date: dayDate, events: dayEvents } : null}
    />
  );
}
