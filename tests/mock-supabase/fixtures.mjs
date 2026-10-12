// Тестовые события. Привязаны к октябрю 2026: тесты открывают ?m=2026-10,
// поэтому от реальной даты не зависят. «Сегодня» тесты считают сами.
export const MOCK_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "me@example.com",
  password: "secret123",
};

export const FIXTURE_EVENTS = [
  // 27 сен 23:00 → 28 сен 01:00: проверяет «день до сетки» (сетка октября начинается 28 сен)
  { id: "fx-0", title: "Ночная смена", event_date: "2026-09-27", all_day: false, start_time: "23:00:00", end_time: "01:00:00", color: "orange" },
  { id: "fx-1", title: "Событие 1", event_date: "2026-10-12", all_day: true, start_time: null, end_time: null, color: "red" },
  { id: "fx-2", title: "Событие 2", event_date: "2026-10-12", all_day: false, start_time: "10:00:00", end_time: "11:00:00", color: "blue" },
  { id: "fx-3", title: "Событие 3", event_date: "2026-10-12", all_day: false, start_time: "15:00:00", end_time: null, color: "green" },
  // 4 события в один день: точек не больше 3
  { id: "fx-4", title: "Событие 4", event_date: "2026-10-14", all_day: false, start_time: "09:00:00", end_time: null, color: "blue" },
  { id: "fx-5", title: "Событие 5", event_date: "2026-10-14", all_day: false, start_time: "10:00:00", end_time: null, color: "green" },
  { id: "fx-6", title: "Событие 6", event_date: "2026-10-14", all_day: false, start_time: "11:00:00", end_time: null, color: "yellow" },
  { id: "fx-7", title: "Событие 7", event_date: "2026-10-14", all_day: false, start_time: "12:00:00", end_time: null, color: "purple" },
  // 22:00–00:00 — заканчивается ровно в полночь, продолжения нет
  { id: "fx-8", title: "Событие 8", event_date: "2026-10-20", all_day: false, start_time: "22:00:00", end_time: "00:00:00", color: "gray" },
  // 31 окт 22:00 → 1 ноя 02:00: точка в «хвосте» сетки
  { id: "fx-9", title: "Событие 9", event_date: "2026-10-31", all_day: false, start_time: "22:00:00", end_time: "02:00:00", color: "purple" },
  { id: "fx-10", title: "Событие 10", event_date: "2026-11-20", all_day: false, start_time: "18:00:00", end_time: "19:00:00", color: "yellow" },
];
