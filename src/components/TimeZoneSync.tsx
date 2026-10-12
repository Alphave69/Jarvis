"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Кладёт IANA-пояс браузера в cookie `tz`, чтобы сервер считал «сегодня»
 * по времени пользователя, а не сервера. Если пояс изменился — перерисовка.
 */
export function TimeZoneSync() {
  const router = useRouter();

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;

    const current = document.cookie
      .split("; ")
      .find((part) => part.startsWith("tz="))
      ?.slice(3);
    if (current && decodeURIComponent(current) === tz) return;

    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax${secure}`;
    router.refresh();
  }, [router]);

  return null;
}
