-- Push notification aplikasi Android (repo Loki4x-apk) lewat Firebase Cloud Messaging.
-- Jalankan sekali di Supabase → SQL Editor. Aman dijalankan ulang.
-- Satu baris = satu HP. Tulis/hapus HANYA lewat server (service role); user hanya bisa melihat miliknya.

create table if not exists public.mobile_push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null default 'android' check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists mobile_push_tokens_user_idx on public.mobile_push_tokens (user_id);

alter table public.mobile_push_tokens enable row level security;

drop policy if exists "mobile push read own" on public.mobile_push_tokens;
create policy "mobile push read own"
  on public.mobile_push_tokens
  for select
  to authenticated
  using (user_id = auth.uid());
