import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents выключен сознательно: приложение целиком персональное
  // и динамическое (сессия в cookies, данные под RLS), статическая оболочка
  // почти ничего не даёт, а Date/new Date() при пререндере становятся ошибкой.
  // См. CLAUDE.md → «Особенности Next.js 16».
  // Значок «N» в dev перекрывал кнопки в углах; ошибки Next покажет и без него.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
