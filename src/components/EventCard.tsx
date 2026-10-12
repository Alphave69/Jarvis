"use client";

import { EVENT_COLORS } from "@/lib/colors";
import type { DayEvent, EventDetails } from "@/lib/data/events";
import { addDays, endsNextDay, formatFullDate } from "@/lib/dates";
import { reminderLabel } from "@/lib/reminders";

type Props = {
  /** Дата открытой карточки дня. */
  dayDate: string;
  /** Строка из списка дня — показываем сразу, пока грузятся детали. */
  summary?: DayEvent;
  /** undefined — грузится, null — не найдено (удалено или чужое). */
  details: EventDetails | null | undefined;
};

/** Карточка события (шаг 5 — только просмотр; изменение — шаг 6, заметки — шаг 7). */
export function EventCard({ dayDate, summary, details }: Props) {
  if (details === null) {
    return (
      <div className="py-6 text-center">
        <p className="text-lg">Событие не найдено</p>
        <p className="pt-1 text-muted">Возможно, его удалили.</p>
      </div>
    );
  }

  const source = details ?? summary;
  if (!source) return <p className="py-4 text-muted">Загрузка…</p>;

  const eventDate =
    details?.event_date ?? (summary?.continued ? addDays(dayDate, -1) : dayDate);

  return (
    <article className="flex flex-col gap-4 pt-1 pb-4">
      <div className="flex items-start gap-3">
        <span
          className="mt-2.5 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: EVENT_COLORS[source.color].hex }}
          aria-label={EVENT_COLORS[source.color].label}
        />
        <h3 className="min-w-0 text-2xl font-semibold break-words">{source.title}</h3>
      </div>

      <dl className="flex flex-col divide-y divide-separator rounded-xl bg-surface-2">
        <Row label="Дата" icon={<CalendarIcon />}>
          {formatFullDate(eventDate)}
        </Row>
        <Row label="Время" icon={<ClockIcon />}>
          {timeText(source)}
        </Row>
        {details?.reminder_enabled && details.reminder_minutes_before !== null && (
          <Row label="Напоминание" icon={<BellIcon />}>
            {reminderLabel(details.all_day, details.reminder_minutes_before)}
          </Row>
        )}
      </dl>
    </article>
  );
}

function timeText(e: Pick<EventDetails, "all_day" | "start_time" | "end_time">): string {
  if (e.all_day) return "Весь день";
  if (!e.start_time) return "";
  if (!e.end_time) return `с ${e.start_time}`;
  const nextDay = endsNextDay(e.start_time, e.end_time) ? ", следующего дня" : "";
  return `${e.start_time} – ${e.end_time}${nextDay}`;
}

function Row({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-4 py-2">
      <dt className="shrink-0 text-muted">
        <span className="sr-only">{label}</span>
        {icon}
      </dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg {...iconProps}>
      <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 003.4 0" />
    </svg>
  );
}
