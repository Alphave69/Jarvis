"use server";

import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email: string };

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Введите почту и пароль.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: signInErrorMessage(error), email };

  // redirect() бросает исключение — не оборачивать в try/catch.
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  // local — выйти только на этом устройстве (по умолчанию global — везде).
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

function signInErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Неверная почта или пароль.";
    case "email_not_confirmed":
      return "Почта не подтверждена. Подтвердите пользователя в панели Supabase.";
    case "user_banned":
      return "Доступ заблокирован.";
    case "over_request_rate_limit":
      return "Слишком много попыток. Подождите минуту.";
    case "validation_failed":
    case "email_address_invalid":
      return "Проверьте почту и пароль.";
  }
  if (isAuthRetryableFetchError(error)) {
    return "Нет связи с сервером. Проверьте интернет.";
  }
  if (error.status === 429) return "Слишком много попыток. Подождите минуту.";
  return "Не удалось войти. Попробуйте ещё раз.";
}
