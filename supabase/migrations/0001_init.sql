-- 0001_init.sql — события и заметки (этап 1)
-- Применять один раз: Supabase → SQL Editor. Атомарно (begin/commit).
-- Если редактор вернул ошибку — выполнить `rollback;`, исправить, запустить снова.

begin;

-- ─── updated_at ───────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

-- Напрямую её никто не вызывает; при срабатывании триггера EXECUTE не проверяется.
revoke execute on function public.set_updated_at() from public, anon, authenticated;

-- ─── events ───────────────────────────────────────────────────
create table public.events (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
  title                   text not null,
  event_date              date not null,
  all_day                 boolean not null default false,
  start_time              time,
  end_time                time,  -- end_time < start_time => конец на event_date + 1
  timezone                text not null default 'Europe/Moscow',
  color                   text not null default 'blue',
  reminder_enabled        boolean not null default false,
  reminder_minutes_before integer,
  jarvis_comment          text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint events_title_not_blank
    check (title ~ '\S'),
  constraint events_color_valid
    check (color in ('red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray')),
  constraint events_time_shape
    check ((all_day and start_time is null and end_time is null)
        or (not all_day and start_time is not null)),
  constraint events_end_not_equal_start
    check (end_time is null or end_time <> start_time),
  constraint events_reminder_minutes_nonneg
    check (reminder_minutes_before >= 0),
  constraint events_reminder_minutes_required
    check (not reminder_enabled or reminder_minutes_before is not null),
  -- цель составного FK из notes: гарантирует notes.user_id = events.user_id
  constraint events_id_user_id_key unique (id, user_id)
);

create index events_user_id_event_date_idx on public.events (user_id, event_date);

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ─── notes ────────────────────────────────────────────────────
create table public.notes (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null,
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint notes_body_not_blank
    check (body ~ '\S'),
  constraint notes_event_fk
    foreign key (event_id, user_id)
    references public.events (id, user_id) on delete cascade
);

create index notes_event_id_user_id_idx on public.notes (event_id, user_id);
create index notes_user_id_idx on public.notes (user_id);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.notes  enable row level security;

create policy events_select_own on public.events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy events_insert_own on public.events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy events_update_own on public.events
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy events_delete_own on public.events
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy notes_select_own on public.notes
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notes_insert_own on public.notes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = notes.event_id
        and e.user_id = (select auth.uid())
    )
  );

create policy notes_update_own on public.notes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.events e
      where e.id = notes.event_id
        and e.user_id = (select auth.uid())
    )
  );

create policy notes_delete_own on public.notes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── Права (Data API: «auto-expose new tables» выключен) ─────
grant usage on schema public to authenticated;
revoke all on table public.events, public.notes from anon, authenticated;
grant select, insert, update, delete on table public.events, public.notes to authenticated;

notify pgrst, 'reload schema';

commit;
