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
import type { DayEvent, DayMarkers } from "@/lib/data/events";
import type { EventColor } from "@/lib/database.types";
import { DaySheet } from "./DaySheet";
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
  /** Открытая карточка дня (?d=YYYY-MM-DD) и её события с сервера. */
  day: { date: string; events: DayEvent[] } | null;
};

type Direction = "next" | "prev";

/** Сдвиг пальца (px), после которого свайп листает месяц. */
const SWIPE_THRESHOLD = 60;
/** Сдвиг, после которого понимаем, горизонтальный жест или вертикальный. */
const SWIPE_LOCK = 10;

export function MonthView({ month, today, markers, day }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  // Месяц и карточка дня меняются на экране сразу, данные догружаются с сервера.
  const [shownMonth, setShownMonth] = useOptimistic(month);
  const [openDate, setOpenDate] = useOptimistic(day?.date ?? null);
  // Закрытие через router.back() — не transition, поэтому прячем карточку сами.
  const [closedDate, setClosedDate] = useState<string | null>(null);
  const openedInApp = useRef(false);
  const keyboardProxy = useRef<HTMLInputElement>(null);
  const [direction, setDirection] = useState<Direction | null>(null);

  const markersReady = compareMonths(shownMonth, month) === 0;
  const todayMonth = monthOf(today);
  const visibleDate = openDate !== null && openDate !== closedDate ? openDate : null;

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

  function openDay(date: string, inMonth: YearMonth = shownMonth) {
    // iOS открывает клавиатуру только на focus() внутри жеста пользователя:
    // фокусируем скрытое поле сейчас, карточка затем переводит фокус в своё.
    keyboardProxy.current?.focus({ preventScroll: true });
    openedInApp.current = true;
    setClosedDate(null);
    if (compareMonths(inMonth, shownMonth) !== 0) {
      setDirection(compareMonths(inMonth, shownMonth) > 0 ? "next" : "prev");
    }
    startTransition(() => {
      setShownMonth(inMonth);
      setOpenDate(date);
      router.push(`/?m=${formatMonthParam(inMonth)}&d=${date}`, { scroll: false });
    });
  }

  function closeDay() {
    setClosedDate(visibleDate);
    if (openedInApp.current) {
      openedInApp.current = false;
      router.back();
    } else {
      startTransition(() => {
        router.replace(`/?m=${formatMonthParam(shownMonth)}`, { scroll: false });
      });
    }
  }

  useArrowKeys(goPrev, goNext, visibleDate === null);
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
        onClickCapture={swipe.onClickCapture}
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
              onOpen={() => openDay(date)}
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
        <button
          type="button"
          onClick={() => openDay(today, todayMonth)}
          aria-label="Новое событие на сегодня"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white active:opacity-70"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <form action={signOut}>
          <button type="submit" className="h-12 px-2 text-base text-muted active:opacity-60">
            Выйти
          </button>
        </form>
      </footer>

      {/* Принимает фокус в момент тапа, чтобы iOS открыл клавиатуру (см. openDay). */}
      <input
        ref={keyboardProxy}
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none fixed top-0 left-0 h-px w-px text-base opacity-0"
      />

      {visibleDate && (
        <DaySheet
          key={visibleDate}
          date={visibleDate}
          today={today}
          events={day?.date === visibleDate ? day.events : null}
          onClose={closeDay}
        />
      )}
    </main>
  );
}

function DayCell({
  date,
  onOpen,
  inMonth,
  isToday,
  isWeekend,
  colors,
}: {
  date: string;
  onOpen: () => void;
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
    <button
      type="button"
      onClick={onOpen}
      className="flex cursor-pointer flex-col items-center border-t border-separator pt-1.5 outline-none transition-colors hover:bg-surface focus-visible:bg-surface active:bg-surface-2"
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
    </button>
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
function useArrowKeys(onLeft: () => void, onRight: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft") onLeft();
      if (e.key === "ArrowRight") onRight();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLeft, onRight, enabled]);
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

  // После свайпа палец отпускается над клеткой — этот клик не должен открыть день.
  const suppressClick = useRef(false);

  const reset = () => {
    gesture.current = null;
    setDx(0);
  };

  return {
    dx,
    onClickCapture(e: React.MouseEvent) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onPointerDown(e: PointerEvent) {
      suppressClick.current = false;
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
      // Палец сдвинулся — это был жест, а не тап. Сбросится на следующем pointerdown.
      suppressClick.current = g.axis !== null;
      reset();
      if (!horizontal || Math.abs(moveX) < SWIPE_THRESHOLD) return;
      if (moveX < 0) onSwipeLeft();
      else onSwipeRight();
    },
    onPointerCancel: reset,
  };
}
