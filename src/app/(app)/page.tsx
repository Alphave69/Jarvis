import { MonthView } from "@/components/MonthView";
import { getDayMarkers } from "@/lib/data/events";
import { monthGridRange, monthOf, parseMonthParam, todayIn } from "@/lib/dates";
import { getUserTimeZone } from "@/lib/timezone";

export default async function MonthPage({ searchParams }: PageProps<"/">) {
  const { m } = await searchParams;
  const today = todayIn(await getUserTimeZone());
  const month = parseMonthParam(typeof m === "string" ? m : null) ?? monthOf(today);

  const { from, to } = monthGridRange(month);
  const markers = await getDayMarkers(from, to);

  return <MonthView month={month} today={today} markers={markers} />;
}
