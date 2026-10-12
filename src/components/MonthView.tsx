"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
} from "react";

import { signOut } from "@/lib/actions/auth";
import { EVENT_COLORS } from "@/lib/colors";
import type { DayMarkers } from "@/lib/data/events";
import type { EventColor } from "@/lib/database.types";
import {
  MONTH_NAMES,
  WEEKDAY_SHORT,
  addMonths,
  compareMonths,
  formatDayMonth,
  formatMonthParam,
  monthGridDates,
  monthOf,
  parseDate,
  todayIn,
  type YearMonth,
} from "@/lib/dates";

type Props = {
  month: YearMonth;
  today: string;
  markers: DayMarkers;
};

type Direction = "next" | "prev";

/** Сдвиг пальца (px), после которого свайп листает месяц. */
const SWIPE_THRESHOLD = 60;
/** Сдвиг, после которого понимаем, горизонтальный жест или вертикальный. */
const SWIPE_LOCK = 10;

export function MonthView({ month, today, markers }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Месяц на экране меняется сразу, данные (точки) догружаются с сервера.
  const [shownMonth, setShownMonth] = useOptimistic(month);
  const [direction, setDirection] = useState<Direction | null>(null);

  const markersReady = compareMonths(shownMonth, month) === 0;
  const todayMonth = monthOf(today);

  const goTo = useCallback(
    (target: YearMonth) => {
      const delta = compareMonths(target, shownMonth);
      if (delta === 0) return;
      setDirection(delta > 0 ? "next" : "prev");
      startTransition(() => {
        setShownMonth(target);
        router.push(`/?m=${formatMonthParam(target)}`, { scroll: false });
      });
    },
    [router, setShownMonth, shownMonth],
  );

  const goNext = useCallback(() => goTo(addMonths(shownMonth, 1)), [goTo, shownMonth]);
  const goPrev = useCallback(() => goTo(addMonths(shownMonth, -1)), [goTo, shownMonth]);

  useArrowKeys(goPrev, goNext);
  useRefreshOnNewDay(today);
  const swipe = useHorizontalSwipe(goPrev, goNext);

  const dates = monthGridDates(shownMonth);
  const monthKey = formatMonthParam(shownMonth);

  return (
    <main className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <header className="flex items-center justify-between px-4 pt-2 pb-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {MONTH_NAMES[shownMonth.month - 1]}{" "}
          <span className="text-muted">{shownMonth.year}</span>
        </h1>
        <div className="-mr-2 flex">
          <IconButton label="Предыдущий месяц" onClick={goPrev}>
            <path d="M15 18l-6-6 6-6" />
          </IconButton>
          <IconButton label="Следующий месяц" onClick={goNext}>
            <path d="M9 18l6-6-6-6" />
          </IconButton>
        </div>
      </header>

      <div className="grid grid-cols-7 px-1 pb-1.5 text-center text-xs font-medium text-muted">
        {WEEKDAY_SHORT.map((name, i) => (
          <div key={name} className={i >= 5 ? "opacity-60" : undefined}>
            {name}
          </div>
        ))}
      </div>

      <div
        className="relative flex-1 touch-pan-y select-none"
        onPointerDown={swipe.onPointerDown}
        onPointerMove={swipe.onPointerMove}
        onPointerUp={swipe.onPointerUp}
        onPointerCancel={swipe.onPointerCancel}
      >
        <div
          key={monthKey}
          className={
            "grid h-full grid-cols-7 grid-rows-6 px-1 " +
            (direction === "next"
              ? "animate-month-from-right"
              : direction === "prev"
                ? "animate-month-from-left"
                : "")
          }
          style={{
            transform: swipe.dx ? `translateX(${swipe.dx}px)` : undefined,
            transition: swipe.dx ? "none" : "transform 150ms ease-out",
          }}
        >
          {dates.map((date, i) => (
            <DayCell
              key={date}
              date={date}
              inMonth={parseDate(date).month === shownMonth.month}
              isToday={date === today}
              isWeekend={i % 7 >= 5}
              colors={markersReady ? markers[date] : undefined}
            />
          ))}
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-separator px-2 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={() => goTo(todayMonth)}
          className="h-12 px-2 text-base text-accent active:opacity-60"
        >
          Сегодня
        </button>
        <form action={signOut}>
          <button type="submit" className="h-12 px-2 text-base text-muted active:opacity-60">
            Выйти
          </button>
        </form>
      </footer>
    </main>
  );
}

function DayCell({
  date,
  inMonth,
  isToday,
  isWeekend,
  colors,
}: {
  date: string;
  inMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  colors?: EventColor[];
}) {
  const { day } = parseDate(date);
  const numberClass = isToday
    ? "bg-accent font-semibold text-white"
    : !inMonth
      ? "text-muted opacity-40"
      : isWeekend
        ? "text-muted"
        : "text-foreground";

  return (
    <div
      className="flex flex-col items-center border-t border-separator pt-1.5"
      aria-label={formatDayMonth(date) + (colors?.length ? ", есть события" : "")}
      aria-current={isToday ? "date" : undefined}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-[17px] ${numberClass}`}
      >
        {day}
      </span>
      <span className="mt-1 flex h-1.5 gap-[3px]" aria-hidden>
        {colors?.map((color, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${inMonth ? "" : "opacity-40"}`}
            style={{ backgroundColor: EVENT_COLORS[color].hex }}
          />
        ))}
      </span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full text-accent active:bg-surface-2"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

/** ← / → на клавиатуре (ПК). */
function useArrowKeys(onLeft: () => void, onRight: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") onLeft();
      if (e.key === "ArrowRight") onRight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLeft, onRight]);
}

/**
 * Если приложение открыто через полночь (PWA висит в фоне) — перерисовать,
 * чтобы подсветка «сегодня» переехала. Один refresh на каждую новую дату.
 */
function useRefreshOnNewDay(today: string) {
  const router = useRouter();
  const refreshedFor = useRef<string | null>(null);

  useEffect(() => {
    const check = () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const actual = todayIn(tz);
      if (actual !== today && refreshedFor.current !== actual) {
        refreshedFor.current = actual;
        router.refresh();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(check, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [today, router]);
}

/** Свайп влево/вправо пальцем. Мышь не участвует — на ПК стрелки и клавиши. */
function useHorizontalSwipe(onSwipeRight: () => void, onSwipeLeft: () => void) {
  const [dx, setDx] = useState(0);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    axis: "x" | "y" | null;
  } | null>(null);

  const reset = () => {
    gesture.current = null;
    setDx(0);
  };

  return {
    dx,
    onPointerDown(e: PointerEvent) {
      if (e.pointerType === "mouse" || gesture.current) return;
      gesture.current = { id: e.pointerId, x: e.clientX, y: e.clientY, axis: null };
    },
    onPointerMove(e: PointerEvent) {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      const moveX = e.clientX - g.x;
      const moveY = e.clientY - g.y;
      if (!g.axis) {
        if (Math.abs(moveX) < SWIPE_LOCK && Math.abs(moveY) < SWIPE_LOCK) return;
        g.axis = Math.abs(moveX) > Math.abs(moveY) ? "x" : "y";
      }
      if (g.axis === "x") setDx(moveX);
    },
    onPointerUp(e: PointerEvent) {
      const g = gesture.current;
      if (!g || g.id !== e.pointerId) return;
      const moveX = e.clientX - g.x;
      const horizontal = g.axis === "x";
      reset();
      if (!horizontal || Math.abs(moveX) < SWIPE_THRESHOLD) return;
      if (moveX < 0) onSwipeLeft();
      else onSwipeRight();
    },
    onPointerCancel: reset,
  };
}
