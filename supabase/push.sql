-- Notifikasi push (Web Push). Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
-- Satu baris = satu perangkat/browser milik satu user.
-- Tulis/hapus: HANYA lewat server (service role). User hanya boleh MELIHAT baris miliknya sendiri.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push read own" on public.push_subscriptions;
create policy "push read own"
  on public.push_subscriptions
  for select
  to authenticated
  using (user_id = auth.uid());
