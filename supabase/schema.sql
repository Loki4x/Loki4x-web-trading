-- ============================================================
-- Loki4x — Database Schema
-- Tables: profiles, trades, news
-- Run this in the Supabase SQL editor on a fresh project.
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- trades
-- ------------------------------------------------------------
create table if not exists public.trades (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('LONG', 'SHORT')),
  entry_price numeric(18, 5) not null,
  exit_price numeric(18, 5),
  pnl numeric(18, 2),
  trade_date date not null default current_date,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists trades_user_id_idx on public.trades(user_id);
create index if not exists trades_trade_date_idx on public.trades(trade_date desc);

alter table public.trades enable row level security;

create policy "Users can view their own trades"
  on public.trades for select
  using (auth.uid() = user_id);

create policy "Users can insert their own trades"
  on public.trades for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trades"
  on public.trades for update
  using (auth.uid() = user_id);

create policy "Users can delete their own trades"
  on public.trades for delete
  using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- news
-- Public read access for all authenticated users, admin-only writes.
-- ------------------------------------------------------------
create table if not exists public.news (
  id uuid primary key default uuid_generate_v4(),
  event_title text not null,
  currency text not null,
  impact_level text not null check (impact_level in ('HIGH', 'MEDIUM', 'LOW')),
  release_time timestamptz not null,
  actual text,
  forecast text,
  previous text,
  created_at timestamptz not null default now()
);

create index if not exists news_release_time_idx on public.news(release_time);

alter table public.news enable row level security;

-- Add an `is_admin` flag to profiles to gate news writes
alter table public.profiles add column if not exists is_admin boolean not null default false;

create policy "Any authenticated user can read news"
  on public.news for select
  using (auth.role() = 'authenticated');

create policy "Only admins can insert news"
  on public.news for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Only admins can update news"
  on public.news for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Only admins can delete news"
  on public.news for delete
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );
