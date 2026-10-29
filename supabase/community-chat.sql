-- Chat komunitas per tier (Free / VIP / Membership).
-- Jalankan sekali di Supabase → SQL Editor.
-- Baca: lewat RLS (tier lebih tinggi boleh membaca ruang tier di bawahnya).
-- Tulis/hapus: HANYA lewat server (service role), jadi tidak ada policy insert/delete.

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null check (room in ('FREE', 'VIP', 'MEMBERSHIP')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  author_tier text not null default 'FREE',
  is_admin boolean not null default false,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists community_messages_room_created_idx
  on public.community_messages (room, created_at desc);

alter table public.community_messages enable row level security;

-- Peringkat akses user yang sedang login: -1 = disuspend, 0 = Free, 1 = VIP, 2 = Membership/Admin.
-- Tier kedaluwarsa dihitung Free.
create or replace function public.my_community_rank()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.is_suspended is true then -1
    when p.is_admin is true then 2
    when p.tier = 'MEMBERSHIP' and (p.vip_expires_at is null or p.vip_expires_at > now()) then 2
    when p.tier = 'VIP' and (p.vip_expires_at is null or p.vip_expires_at > now()) then 1
    else 0
  end
  from public.profiles p
  where p.id = auth.uid()
$$;

create or replace function public.community_room_rank(r text)
returns int
language sql
immutable
as $$
  select case r when 'MEMBERSHIP' then 2 when 'VIP' then 1 else 0 end
$$;

drop policy if exists "community read by tier" on public.community_messages;
create policy "community read by tier"
  on public.community_messages
  for select
  to authenticated
  using (public.my_community_rank() >= public.community_room_rank(room));

-- Realtime (pesan baru muncul langsung tanpa refresh).
do $$
begin
  alter publication supabase_realtime add table public.community_messages;
exception
  when duplicate_object then null;
end $$;
