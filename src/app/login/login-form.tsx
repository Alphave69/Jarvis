"use client";

import { useActionState } from "react";

import { signIn, type SignInState } from "@/lib/actions/auth";

const initialState: SignInState = { error: null, email: "" };

// text-base (16px) у полей — иначе iOS Safari зумит страницу при фокусе.
const inputClass =
  "h-12 w-full bg-transparent px-4 text-base text-foreground placeholder:text-muted outline-none";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-xl bg-surface">
        <label className="sr-only" htmlFor="email">
          Почта
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          placeholder="Почта"
          defaultValue={state.email}
          className={inputClass}
        />
        <div className="ml-4 h-px bg-separator" />
        <label className="sr-only" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Пароль"
          className={inputClass}
        />
      </div>

      {state.error && (
        <p role="alert" className="px-1 text-sm text-accent">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-xl bg-accent text-base font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-50"
      >
        {pending ? "Входим…" : "Войти"}
      </button>
    </form>
  );
}
