"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";

import { EVENT_COLORS } from "@/lib/colors";
import type { DayEvent } from "@/lib/data/events";
import { endsNextDay, formatDayTitle } from "@/lib/dates";
import { NewEventForm } from "./NewEventForm";

type Props = {
  date: string;
  today: string;
  /** null — список ещё грузится с сервера. */
  events: DayEvent[] | null;
  onClose: () => void;
};

/** Насколько потянуть шапку вниз, чтобы закрыть (px). */
const DRAG_CLOSE = 100;

/**
 * Карточка дня = вид «день». На телефоне — шторка снизу, на ПК — окно.
 * Нативный <dialog>: Esc, фокус внутри и «инертный» фон браузер даёт сам.
 */
export function DaySheet({ date, today, events, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keyboardInset = useKeyboardInset();
  const drag = useDragToClose(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // showModal() фокусирует первую кнопку («Закрыть»): React не пишет
    // атрибут autofocus в DOM. Переводим фокус в поле названия сами.
    dialog.querySelector<HTMLInputElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={formatDayTitle(date)}
      onCancel={(e) => {
        e.preventDefault(); // Esc: закрываем сами, через URL
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // клик по фону
      }}
      style={{
        bottom: keyboardInset.bottom,
        maxHeight: keyboardInset.maxHeight,
        transform: drag.dy ? `translateY(${drag.dy}px)` : undefined,
      }}
      className="animate-sheet-up fixed inset-x-0 top-auto m-0 flex w-full max-w-none flex-col overflow-hidden rounded-t-2xl bg-surface p-0 text-foreground backdrop:bg-black/60 md:inset-0 md:m-auto md:h-fit md:max-w-md md:rounded-2xl md:animate-none"
    >
      <div
        className="shrink-0 touch-none px-4 pt-2 md:pt-4"
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
      >
        <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-separator md:hidden" aria-hidden />
        <div className="flex items-center justify-between pb-2">
          <h2 className="text-xl font-semibold">
            {formatDayTitle(date)}
            {date === today && <span className="ml-2 text-base font-normal text-accent">сегодня</span>}
          </h2>
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        <DayEventList events={events} />
      </div>

      <div className="shrink-0 border-t border-separator px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <NewEventForm key={date} date={date} today={today} />
      </div>
    </dialog>
  );
}

function DayEventList({ events }: { events: DayEvent[] | null }) {
  if (events === null) {
    return <p className="py-4 text-muted">Загрузка…</p>;
  }
  if (events.length === 0) {
    return <p className="py-4 text-muted">Пока пусто</p>;
  }
  return (
    <ul className="divide-y divide-separator">
      {events.map((event) => (
        <li key={event.id + (event.continued ? ":cont" : "")} className="flex min-h-12 items-center gap-3 py-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: EVENT_COLORS[event.color].hex }}
            aria-hidden
          />
          <span className="w-24 shrink-0 text-sm tabular-nums text-muted">{timeLabel(event)}</span>
          <span className="min-w-0 flex-1 break-words">{event.title}</span>
        </li>
      ))}
    </ul>
  );
}

function timeLabel(event: DayEvent): string {
  if (event.all_day) return "Весь день";
  if (event.continued) return `до ${event.end_time}`;
  if (!event.end_time) return event.start_time ?? "";
  const next = endsNextDay(event.start_time, event.end_time) ? "⁺¹" : "";
  return `${event.start_time}–${event.end_time}${next}`;
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
