-- Balas pesan di komunitas. Jalankan SETELAH community-extras.sql, sekali di Supabase → SQL Editor.
-- Aman dijalankan ulang.
alter table public.community_messages
  add column if not exists reply_to uuid references public.community_messages(id) on delete set null,
  add column if not exists reply_name text,
  add column if not exists reply_excerpt text;
