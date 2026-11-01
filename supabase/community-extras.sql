-- Penyempurnaan chat komunitas: ruang Pengumuman, pesan disematkan, penanda belum dibaca, laporan pesan.
-- Jalankan SETELAH community-chat.sql dan community-chat-images.sql, sekali di Supabase → SQL Editor.
-- Aman dijalankan ulang.

-- 1) Ruang baru "ANNOUNCEMENT" (dibaca semua tier, ditulis hanya admin lewat server).
alter table public.community_messages
  drop constraint if exists community_messages_room_check;
alter table public.community_messages
  add constraint community_messages_room_check
  check (room in ('ANNOUNCEMENT', 'FREE', 'VIP', 'MEMBERSHIP'));
-- (community_room_rank sudah menganggap ruang selain VIP/MEMBERSHIP sebagai peringkat 0 = semua tier boleh baca.)

-- 2) Pesan disematkan.
alter table public.community_messages
  add column if not exists pinned_at timestamptz;

-- 3) Penanda belum dibaca: kapan terakhir user membuka tiap ruang.
create table if not exists public.community_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  room text not null check (room in ('ANNOUNCEMENT', 'FREE', 'VIP', 'MEMBERSHIP')),
  last_read_at timestamptz not null default now(),
  primary key (user_id, room)
);

alter table public.community_reads enable row level security;

drop policy if exists "community reads own" on public.community_reads;
create policy "community reads own"
  on public.community_reads
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4) Laporan pesan. Penulisan lewat server; hanya admin yang boleh melihat.
create table if not exists public.community_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.community_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

create index if not exists community_reports_message_idx on public.community_reports (message_id);

alter table public.community_reports enable row level security;

drop policy if exists "community reports admin read" on public.community_reports;
create policy "community reports admin read"
  on public.community_reports
  for select
  to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
