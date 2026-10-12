import type { EventColor } from "@/lib/database.types";

// Системные цвета iOS (тёмная тема). Порядок = порядок в палитре формы.
export const EVENT_COLORS: Record<EventColor, { hex: string; label: string }> = {
  red: { hex: "#ff453a", label: "Красный" },
  orange: { hex: "#ff9f0a", label: "Оранжевый" },
  yellow: { hex: "#ffd60a", label: "Жёлтый" },
  green: { hex: "#30d158", label: "Зелёный" },
  blue: { hex: "#0a84ff", label: "Синий" },
  purple: { hex: "#bf5af2", label: "Фиолетовый" },
  gray: { hex: "#8e8e93", label: "Серый" },
};
