import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents выключен сознательно: приложение целиком персональное
  // и динамическое (сессия в cookies, данные под RLS), статическая оболочка
  // почти ничего не даёт, а Date/new Date() при пререндере становятся ошибкой.
  // См. CLAUDE.md → «Особенности Next.js 16».
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
