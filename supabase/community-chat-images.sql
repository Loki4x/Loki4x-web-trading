-- Foto di chat komunitas. Jalankan SETELAH supabase/community-chat.sql, sekali di Supabase → SQL Editor.
-- Aman dijalankan ulang.

alter table public.community_messages
  add column if not exists image_key text;

-- Pesan boleh tanpa teks kalau ada foto (maksimal 500 karakter).
alter table public.community_messages
  alter column body set default '';

alter table public.community_messages
  drop constraint if exists community_messages_body_check;

alter table public.community_messages
  add constraint community_messages_body_check
  check (char_length(body) <= 500 and (char_length(body) > 0 or image_key is not null));
