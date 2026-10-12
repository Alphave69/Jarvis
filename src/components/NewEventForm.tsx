"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";

import { createEventAction } from "@/lib/actions/events";
import { EVENT_COLORS } from "@/lib/colors";
import type { EventColor } from "@/lib/database.types";
import { addMinutesToTime, endsNextDay } from "@/lib/dates";
import {
  DEFAULT_REMINDER_MINUTES,
  EVENT_COLOR_VALUES,
  REMINDER_OPTIONS,
  TITLE_MAX_LENGTH,
} from "@/lib/event-input";

type Props = {
  date: string;
  /** Сегодня в поясе пользователя — для умолчания «следующий полный час». */
  today: string;
};

type Details = {
  allDay: boolean;
  startTime: string;
  endTime: string;
  color: EventColor;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
};

function defaultStart(date: string, today: string): string {
  if (date !== today) return "09:00";
  const hour = Math.min(new Date().getHours() + 1, 23);
  return `${String(hour).padStart(2, "0")}:00`;
}

function initialDetails(date: string, today: string): Details {
  const start = defaultStart(date, today);
  return {
    allDay: true,
    startTime: start,
    endTime: addMinutesToTime(start, 60),
    color: "blue",
    reminderEnabled: false,
    reminderMinutesBefore: DEFAULT_REMINDER_MINUTES,
  };
}

export function NewEventForm({ date, today }: Props) {
  const ids = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(() => initialDetails(date, today));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof Details>(key: K, value: Details[K]) =>
    setDetails((d) => ({ ...d, [key]: value }));

  const canSubmit = title.trim().length > 0 && !pending;
  const nextDay =
    !details.allDay && details.endTime && endsNextDay(details.startTime, details.endTime);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await createEventAction({
        title,
        eventDate: date,
        allDay: details.allDay,
        startTime: details.allDay ? null : details.startTime,
        endTime: details.allDay ? null : details.endTime || null,
        color: details.color,
        reminderEnabled: details.reminderEnabled,
        reminderMinutesBefore: details.reminderEnabled ? details.reminderMinutesBefore : null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Готово: очищаем и оставляем фокус — можно сразу добавить ещё одно.
      setTitle("");
      setExpanded(false);
      setDetails(initialDetails(date, today));
      titleRef.current?.focus();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={`${ids}-title`} className="sr-only">
          Название
        </label>
        <input
          ref={titleRef}
          id={`${ids}-title`}
          data-autofocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Новое событие"
          enterKeyHint="done"
          autoComplete="off"
          className="h-12 min-w-0 flex-1 rounded-xl bg-surface-2 px-4 text-base text-foreground placeholder:text-muted outline-none focus:ring-2 focus:ring-accent/60"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-12 shrink-0 rounded-xl bg-accent px-4 text-base font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-40"
        >
          {pending ? "…" : "Добавить"}
        </button>
      </div>

      {error && (
        <p role="alert" className="px-1 text-sm text-accent">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex h-11 items-center gap-1 self-start px-1 text-sm text-muted active:opacity-60"
      >
        {expanded ? "Скрыть" : "Ещё: время · цвет · напоминание"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden className={expanded ? "rotate-180" : undefined}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {expanded && (
        <div className="flex flex-col divide-y divide-separator rounded-xl bg-surface-2">
          <Toggle label="Весь день" checked={details.allDay} onChange={(v) => set("allDay", v)} />

          {!details.allDay && (
            <div className="flex flex-col gap-1 px-4 py-2">
              <div className="flex items-center gap-3">
                <TimeField
                  label="Начало"
                  value={details.startTime}
                  onChange={(v) => {
                    // Сохраняем длительность: сдвигаем конец вместе с началом.
                    setDetails((d) => {
                      if (!v) return { ...d, startTime: v };
                      const [sh, sm] = d.startTime.split(":").map(Number);
                      const [eh, em] = (d.endTime || d.startTime).split(":").map(Number);
                      const duration = ((eh * 60 + em - (sh * 60 + sm)) % 1440 + 1440) % 1440 || 60;
                      return { ...d, startTime: v, endTime: d.endTime ? addMinutesToTime(v, duration) : "" };
                    });
                  }}
                />
                <span className="pt-5 text-muted">–</span>
                <TimeField
                  label="Конец"
                  value={details.endTime}
                  onChange={(v) => set("endTime", v)}
                />
              </div>
              {nextDay && <p className="text-xs text-muted">Закончится на следующий день</p>}
            </div>
          )}

          <fieldset className="px-4 py-3">
            <legend className="sr-only">Цвет</legend>
            <div className="flex justify-between">
              {EVENT_COLOR_VALUES.map((color) => (
                <label key={color} className="flex h-11 w-11 cursor-pointer items-center justify-center">
                  <input
                    type="radio"
                    name={`${ids}-color`}
                    value={color}
                    checked={details.color === color}
                    onChange={() => set("color", color)}
                    className="peer sr-only"
                    aria-label={EVENT_COLORS[color].label}
                  />
                  <span
                    className="h-7 w-7 rounded-full ring-offset-2 ring-offset-surface-2 peer-checked:ring-2 peer-checked:ring-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
                    style={{ backgroundColor: EVENT_COLORS[color].hex }}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <Toggle
            label="Напомнить"
            checked={details.reminderEnabled}
            onChange={(v) => set("reminderEnabled", v)}
          />
          {details.reminderEnabled && (
            <div className="px-4 py-2">
              <label className="sr-only" htmlFor={`${ids}-reminder`}>
                За сколько напомнить
              </label>
              <select
                id={`${ids}-reminder`}
                value={details.reminderMinutesBefore}
                onChange={(e) => set("reminderMinutesBefore", Number(e.target.value))}
                className="h-11 w-full rounded-lg bg-surface px-3 text-base text-foreground outline-none"
              >
                {REMINDER_OPTIONS.map((o) => (
                  <option key={o.minutes} value={o.minutes}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="pt-1 text-xs text-muted">Отправка напоминаний появится позже.</p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex h-12 cursor-pointer items-center justify-between px-4 text-base">
      {label}
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-[31px] w-[51px] rounded-full bg-[#39393d] transition-colors peer-checked:bg-[#30d158] peer-focus-visible:ring-2 peer-focus-visible:ring-accent after:absolute after:top-[2px] after:left-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
      />
    </label>
  );
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-muted">
      {label}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-lg bg-surface px-3 text-base text-foreground outline-none [color-scheme:dark]"
      />
    </label>
  );
}
