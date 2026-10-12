import { MonthView } from "@/components/MonthView";
import { getDayMarkers, getEvent, listDayEvents } from "@/lib/data/events";
import {
  isValidDateString,
  monthGridRange,
  monthOf,
  parseMonthParam,
  todayIn,
} from "@/lib/dates";
import { getUserTimeZone, serverNow } from "@/lib/timezone";

export default async function MonthPage({ searchParams }: PageProps<"/">) {
  const { m, d, e } = await searchParams;
  const today = todayIn(await getUserTimeZone(), serverNow());
  const month = parseMonthParam(typeof m === "string" ? m : null) ?? monthOf(today);

  // Слои поверх месяца: ?d=YYYY-MM-DD — карточка дня, &e=id — событие в ней.
  const dayDate = typeof d === "string" && isValidDateString(d) ? d : null;
  const eventId = dayDate && typeof e === "string" && e ? e : null;

  const { from, to } = monthGridRange(month);
  const [markers, dayEvents, eventDetails] = await Promise.all([
    getDayMarkers(from, to),
    dayDate ? listDayEvents(dayDate) : null,
    eventId ? getEvent(eventId) : null,
  ]);

  return (
    <MonthView
      month={month}
      today={today}
      markers={markers}
      day={dayDate && dayEvents ? { date: dayDate, events: dayEvents } : null}
      event={eventId ? { id: eventId, details: eventDetails } : null}
    />
  );
}
