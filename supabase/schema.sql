-- Hook Drift — схема Supabase
-- Выполни этот файл целиком в Supabase Dashboard → SQL Editor → New query → Run

-- ---------- Таблица профилей ----------
-- Мы используем встроенную Supabase Auth (email+password), но email синтетический:
-- "ник@hookdrift.game" — так получаем полноценную безопасную регистрацию по
-- нику и паролю без реальной почты (это стандартный приём для Supabase).

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null,
  username_lower text generated always as (lower(username)) stored,
  best_distance integer not null default 0,
  total_playtime_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ник уникален без учёта регистра
create unique index if not exists profiles_username_lower_idx on public.profiles(username_lower);
create index if not exists profiles_best_distance_idx on public.profiles(best_distance desc);
create index if not exists profiles_playtime_idx on public.profiles(total_playtime_seconds desc);

alter table public.profiles enable row level security;

-- таблицу лидеров должны видеть все, в том числе неавторизованные посетители
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

-- создавать профиль может только сам пользователь, себе и один раз
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- обновлять профиль напрямую с клиента запрещаем — только через RPC-функции ниже
-- (это не даёт игроку самому подкрутить себе рекорд через консоль браузера)
drop policy if exists "profiles_no_direct_update" on public.profiles;

-- ---------- RPC: обновить лучший результат по дистанции ----------
-- security definer + фиксированный search_path — обновляет только запись самого
-- вызывающего (auth.uid()), и только если новый результат лучше старого.
create or replace function public.submit_distance(p_distance integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
  set best_distance = greatest(best_distance, p_distance),
      updated_at = now()
  where id = auth.uid();
end;
$$;

-- ---------- RPC: прибавить наигранное время ----------
create or replace function public.add_playtime(p_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  update public.profiles
  set total_playtime_seconds = total_playtime_seconds + greatest(p_seconds, 0),
      updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.submit_distance(integer) to authenticated;
grant execute on function public.add_playtime(integer) to authenticated;

-- ---------- Готово ----------
-- После выполнения этого файла:
-- 1. Project Settings → API — скопируй "Project URL" и "anon public" ключ
-- 2. Впиши их в js/supabase-config.js
-- 3. (Опционально) Authentication → Providers → Email — убедись, что
--    "Confirm email" выключен (Settings → Auth → Email Auth → "Confirm email" = OFF),
--    иначе регистрация синтетическими "почтами" потребует подтверждения,
--    которое некому получить.
