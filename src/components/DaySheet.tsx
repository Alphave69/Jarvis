"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";

import { EVENT_COLORS } from "@/lib/colors";
import type { DayEvent, EventDetails } from "@/lib/data/events";
import {
  endsNextDay,
  formatDayMonth,
  formatDayTitle,
  timeIn,
  timeToMinutes,
} from "@/lib/dates";
import { EventCard } from "./EventCard";
import { NewEventForm } from "./NewEventForm";

type Props = {
  date: string;
  today: string;
  /** null — список ещё грузится с сервера. */
  events: DayEvent[] | null;
  /** Открытое событие (?e=) — карточка события вместо списка дня. */
  eventId: string | null;
  /** Детали открытого события: undefined — грузятся, null — не найдено. */
  event: EventDetails | null | undefined;
  onOpenEvent: (id: string) => void;
  onBackToDay: () => void;
  onClose: () => void;
};

/** Насколько потянуть шапку вниз, чтобы закрыть (px). */
const DRAG_CLOSE = 100;

/**
 * Карточка дня = вид «день»; внутри неё открывается карточка события.
 * На телефоне — шторка снизу, на ПК — окно. Нативный <dialog>: Esc, фокус
 * внутри и «инертный» фон браузер даёт сам.
 */
export function DaySheet({
  date,
  today,
  events,
  eventId,
  event,
  onOpenEvent,
  onBackToDay,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keyboardInset = useKeyboardInset();
  const drag = useDragToClose(onClose);
  const showingEvent = eventId !== null;
  const summary = events?.find((e) => e.id === eventId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  // Фокус при смене вида: в списке дня — поле названия (showModal() иначе
  // выбрал бы «Закрыть»: React не пишет атрибут autofocus в DOM); в карточке
  // события — «Назад»; при возврате — на строку события, откуда пришли.
  const lastEventId = useRef<string | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (eventId) {
      lastEventId.current = eventId;
      dialog.querySelector<HTMLElement>("[data-back]")?.focus();
    } else if (lastEventId.current) {
      dialog
        .querySelector<HTMLElement>(`[data-event-id="${CSS.escape(lastEventId.current)}"]`)
        ?.focus();
      lastEventId.current = null;
    } else {
      dialog.querySelector<HTMLInputElement>("[data-autofocus]")?.focus();
    }
  }, [eventId]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={formatDayTitle(date)}
      onCancel={(e) => {
        e.preventDefault(); // Esc: закрываем сами, через URL
        if (showingEvent) onBackToDay();
        else onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // клик по фону
      }}
      style={{
        bottom: keyboardInset.bottom,
        maxHeight: keyboardInset.maxHeight,
        transform: drag.dy ? `translateY(${drag.dy}px)` : undefined,
      }}
      className="animate-sheet-up fixed inset-x-0 top-auto m-0 flex w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-surface p-0 text-foreground backdrop:bg-black/60 md:inset-0 md:m-auto md:h-fit md:max-h-[85dvh] md:max-w-md md:rounded-2xl md:animate-none"
    >
      <div
        className="shrink-0 touch-none px-4 pt-2 md:pt-4"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-separator md:hidden" aria-hidden />
        <div className="flex min-h-11 items-center justify-between pb-2">
          {showingEvent ? (
            <button
              type="button"
              data-back
              onClick={onBackToDay}
              className="-ml-2 flex h-11 items-center gap-1 rounded-lg pr-2 text-base text-accent active:opacity-60"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              {formatDayMonth(date)}
            </button>
          ) : (
            <h2 className="text-xl font-semibold">
              {formatDayTitle(date)}
              {date === today && <span className="ml-2 text-base font-normal text-accent">сегодня</span>}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-surface-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showingEvent && (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[env(safe-area-inset-bottom)]">
          <EventCard dayDate={date} summary={summary} details={event} />
        </div>
      )}

      {/* Вид дня не размонтируем, а прячем: набранное название не теряется. */}
      <div hidden={showingEvent} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
          <DayEventList events={events} isToday={date === today} onOpen={onOpenEvent} />
        </div>
        <div className="shrink-0 border-t border-separator px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <NewEventForm key={date} date={date} today={today} />
        </div>
      </div>
    </dialog>
  );
}

function DayEventList({
  events,
  isToday,
  onOpen,
}: {
  events: DayEvent[] | null;
  isToday: boolean;
  onOpen: (id: string) => void;
}) {
  const now = useNowTime(isToday);

  if (events === null) {
    return <p className="py-4 text-muted">Загрузка…</p>;
  }
  if (events.length === 0) {
    return <p className="py-4 text-muted">Пока пусто</p>;
  }

  const nowMinutes = now ? timeToMinutes(now) : null;
  const nowIndex = nowMinutes === null ? -1 : nowLineIndex(events, nowMinutes);

  return (
    <ul className="divide-y divide-separator">
      {events.map((event, i) => (
        <EventRow
          key={event.id + (event.continued ? ":cont" : "")}
          event={event}
          past={nowMinutes !== null && isPast(event, nowMinutes)}
          nowBefore={i === nowIndex ? now : null}
          onOpen={onOpen}
        />
      ))}
      {nowIndex === events.length && now && <NowLine time={now} />}
    </ul>
  );
}

function EventRow({
  event,
  past,
  nowBefore,
  onOpen,
}: {
  event: DayEvent;
  past: boolean;
  nowBefore: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <>
      {nowBefore && <NowLine time={nowBefore} />}
      <li>
        <button
          type="button"
          data-event-id={event.id}
          data-past={past || undefined}
          onClick={() => onOpen(event.id)}
          className={`-mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2 active:bg-surface-2 ${past ? "opacity-45" : ""}`}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: EVENT_COLORS[event.color].hex }}
            aria-hidden
          />
          <span className="w-24 shrink-0 text-sm tabular-nums text-muted">{timeLabel(event)}</span>
          <span className="min-w-0 flex-1 break-words">{event.title}</span>
          <svg className="shrink-0 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </li>
    </>
  );
}

/** Красная линия «сейчас» между прошедшими и будущими событиями сегодня. */
function NowLine({ time }: { time: string }) {
  return (
    <li className="flex items-center gap-2 py-1" aria-label={`Сейчас ${time}`} data-now-line>
      <span className="text-xs font-semibold tabular-nums text-accent">{time}</span>
      <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
      <span className="h-px flex-1 bg-accent" aria-hidden />
    </li>
  );
}

function timeLabel(event: DayEvent): string {
  if (event.all_day) return "Весь день";
  if (event.continued) return `до ${event.end_time}`;
  if (!event.end_time) return event.start_time ?? "";
  const next = endsNextDay(event.start_time, event.end_time) ? "⁺¹" : "";
  return `${event.start_time}–${event.end_time}${next}`;
}

/** Закончилось ли событие к моменту now (минуты от полуночи сегодня). */
function isPast(event: DayEvent, now: number): boolean {
  if (event.all_day || !event.start_time) return false;
  if (event.continued) return event.end_time !== null && timeToMinutes(event.end_time) <= now;
  if (endsNextDay(event.start_time, event.end_time)) return false;
  // Без конца — считаем прошедшим, когда началось.
  const end = event.end_time && event.end_time !== "00:00" ? event.end_time : event.start_time;
  return timeToMinutes(end) <= now;
}

/** Перед каким событием рисовать линию «сейчас» (length — в конце; -1 — не рисовать). */
function nowLineIndex(events: DayEvent[], now: number): number {
  if (!events.some((e) => !e.all_day)) return -1;
  const next = events.findIndex(
    (e) => !e.all_day && !e.continued && e.start_time !== null && timeToMinutes(e.start_time) > now,
  );
  return next === -1 ? events.length : next;
}

/**
 * Текущее время 'HH:MM' в поясе браузера, обновляется раз в 30 с.
 * На сервере — null: линия «сейчас» появляется только у клиента (без
 * расхождения при гидратации).
 */
function useNowTime(enabled: boolean): string | null {
  return useSyncExternalStore(
    (onChange) => {
      if (!enabled) return () => {};
      const timer = setInterval(onChange, 30_000);
      return () => clearInterval(timer);
    },
    () => (enabled ? timeIn(Intl.DateTimeFormat().resolvedOptions().timeZone) : null),
    () => null,
  );
}

/**
 * iOS не сжимает страницу под клавиатурой — шторка уехала бы под неё.
 * Берём visualViewport: отступ снизу = высота клавиатуры.
 */
function useKeyboardInset(): { bottom: number; maxHeight: string } {
  const snapshot = useSyncExternalStore(
    (onChange) => {
      const vv = window.visualViewport;
      vv?.addEventListener("resize", onChange);
      vv?.addEventListener("scroll", onChange);
      return () => {
        vv?.removeEventListener("resize", onChange);
        vv?.removeEventListener("scroll", onChange);
      };
    },
    () => {
      const vv = window.visualViewport;
      if (!vv) return "0|0";
      const bottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      return `${bottom}|${Math.round(vv.height)}`;
    },
    () => "0|0",
  );
  const [bottom, height] = snapshot.split("|").map(Number);
  return {
    bottom,
    maxHeight: height ? `${Math.round(height * 0.92)}px` : "92dvh",
  };
}

/** Потянуть шапку шторки вниз пальцем → закрыть. */
function useDragToClose(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const start = useRef<{ id: number; y: number } | null>(null);

  const reset = () => {
    start.current = null;
    setDy(0);
  };

  return {
    dy,
    onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse") return;
      if ((e.target as HTMLElement).closest("button")) return;
      start.current = { id: e.pointerId, y: e.clientY };
    },
    onPointerMove(e: PointerEvent) {
      if (start.current?.id !== e.pointerId) return;
      setDy(Math.max(0, e.clientY - start.current.y));
    },
    onPointerUp(e: PointerEvent) {
      if (start.current?.id !== e.pointerId) return;
      const moved = e.clientY - start.current.y;
      reset();
      if (moved > DRAG_CLOSE) onClose();
    },
    onPointerCancel: reset,
  };
}
