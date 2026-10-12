"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { formatMonthParam, type YearMonth } from "@/lib/dates";

/** Что открыто поверх месяца: день (?d=) и, внутри него, событие (?e=). */
export type Overlay = { d: string | null; e: string | null };

const sameOverlay = (a: Overlay, b: Overlay) => a.d === b.d && a.e === b.e;

export function overlayUrl(month: YearMonth, overlay: Overlay): string {
  const params = new URLSearchParams({ m: formatMonthParam(month) });
  if (overlay.d) params.set("d", overlay.d);
  if (overlay.d && overlay.e) params.set("e", overlay.e);
  return `/?${params.toString()}`;
}

/**
 * Навигация по слоям «месяц → день → событие» через URL.
 *
 * - Открыть слой = push (работает «Назад» в браузере и прямые ссылки).
 * - Закрыть слой = history.back, если этот слой открыли мы сами; если
 *   пришли по прямой ссылке — replace (иначе «Назад» увёл бы из приложения).
 * - Экран меняется сразу (`pending`), не дожидаясь ответа сервера; как только
 *   с сервера пришёл новый URL-слой — показываем его.
 */
export function useOverlayNavigation({
  month,
  server,
  onMonthChange,
}: {
  month: YearMonth;
  server: Overlay;
  /** Оптимистично сменить месяц (вызывается внутри transition). */
  onMonthChange: (month: YearMonth) => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState<Overlay | null>(null);
  // Какие слои открыты нашим push (их можно закрыть через history.back).
  const [pushed, setPushed] = useState({ day: false, event: false });
  const [lastServer, setLastServer] = useState(server);

  // URL сменился (наша навигация завершилась или «Назад» в браузере):
  // ожидание снято, флаги push синхронизируем с тем, что реально открыто.
  if (!sameOverlay(lastServer, server)) {
    setLastServer(server);
    setPending(null);
    setPushed((p) => ({ day: p.day && server.d !== null, event: p.event && server.e !== null }));
  }

  const overlay = pending ?? server;

  function push(target: Overlay, targetMonth: YearMonth = month) {
    setPending(target);
    startTransition(() => {
      onMonthChange(targetMonth);
      router.push(overlayUrl(targetMonth, target), { scroll: false });
    });
  }

  function replace(target: Overlay) {
    setPending(target);
    startTransition(() => {
      router.replace(overlayUrl(month, target), { scroll: false });
    });
  }

  return {
    overlay,

    openDay(date: string, inMonth: YearMonth = month) {
      setPushed({ day: true, event: false });
      push({ d: date, e: null }, inMonth);
    },

    openEvent(id: string) {
      if (!overlay.d) return;
      setPushed((p) => ({ ...p, event: true }));
      push({ d: overlay.d, e: id });
    },

    /** Из карточки события — обратно к списку дня. */
    backToDay() {
      const target = { d: overlay.d, e: null };
      if (pushed.event) {
        setPending(target);
        setPushed((p) => ({ ...p, event: false }));
        router.back();
      } else {
        replace(target);
      }
    },

    /** Закрыть всё и вернуться к месяцу. */
    closeAll() {
      const target = { d: null, e: null };
      if (pushed.day) {
        setPending(target);
        const steps = 1 + (pushed.event ? 1 : 0);
        setPushed({ day: false, event: false });
        window.history.go(-steps);
      } else {
        setPushed({ day: false, event: false });
        replace(target);
      }
    },
  };
}
